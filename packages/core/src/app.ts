import { Storable, LocalStorage } from "./storage";
import { VaultItem, Field, Tag, createVaultItem } from "./data";
import { Vault, VaultInfo } from "./vault";
import { Account, Auth, Session } from "./auth";
import { Invite } from "./invite";
import { DateString } from "./encoding";
import { API } from "./api";
import { Client } from "./client";
import { Sender } from "./transport";
import { localize as $l } from "./locale";
import { DeviceInfo, getDeviceInfo } from "./platform";
import { uuid } from "./util";
import { Client as SRPClient } from "./srp";
import { Err, ErrorCode } from "./error";

export interface Stats {
    lastSync?: DateString;
    [key: string]: string | number | boolean | DateString | undefined;
}

export interface Settings {
    autoLock: boolean;
    autoLockDelay: number;
    defaultFields: string[];
    customServer: boolean;
    customServerUrl: string;
    autoSync: boolean;
}

const defaultSettings: Settings = {
    autoLock: true,
    autoLockDelay: 5,
    defaultFields: ["username", "password"],
    customServer: false,
    customServerUrl: "https://cloud.padlock.io/",
    autoSync: true
};

function filterByString(fs: string, rec: VaultItem) {
    if (!fs) {
        return true;
    }
    const content = [rec.name, ...rec.fields.map(f => f.name)].join(" ").toLowerCase();
    return content.search(fs) !== -1;
}

export interface ListItem {
    item: VaultItem;
    vault: Vault;
    section: string;
    firstInSection: boolean;
    lastInSection: boolean;
    warning?: boolean;
}

export interface FilterParams {
    vault?: Vault | null;
    tag?: Tag | null;
    text?: string;
}

export class App extends EventTarget implements Storable {
    kind = "padlock-app";
    pk = "";

    version = "3.0";
    storage = new LocalStorage();
    api: API;
    settings = defaultSettings;
    stats: Stats = {};
    device: DeviceInfo = {} as DeviceInfo;
    initialized: DateString = "";
    session: Session | null = null;
    account: Account | null = null;
    loaded = this.load();

    constructor(sender: Sender) {
        super();
        this.api = new Client(this, sender);
    }

    get locked() {
        return !this.account || !!this.account.locked;
    }

    get loggedIn() {
        return !!this.session;
    }

    get tags() {
        if (!this.mainVault) {
            return [];
        }
        const tags = this.mainVault.items.tags;
        for (const vault of this.vaults) {
            tags.push(...vault.items.tags);
        }
        return [...new Set(tags)];
    }

    get mainVault() {
        return this.account && this._vaults.get(this.account.mainVault);
    }

    get vaults() {
        return Array.from(this._vaults.values()).sort((a, b) => {
            const nameA = a.toString();
            const nameB = b.toString();
            return b === this.mainVault || nameA > nameB ? 1 : a === this.mainVault || nameA < nameB ? -1 : 0;
        });
    }

    get filter() {
        return this._filter;
    }

    set filter(filter: FilterParams) {
        this._filter = filter;
        this.dispatch("filter-changed", filter);
    }

    private _vaults = new Map<string, Vault>();
    private _filter: FilterParams = {};

    async serialize() {
        return {
            account: this.account ? await this.account.serialize() : null,
            session: this.session ? await this.session.serialize() : null,
            initialized: this.initialized,
            stats: this.stats,
            settings: this.settings,
            device: this.device
        };
    }

    async deserialize(raw: any) {
        this.account = raw.account && (await new Account().deserialize(raw.account));
        this.session = raw.session && (await new Session().deserialize(raw.session));
        this.initialized = raw.initialized;
        this.setStats(raw.stats || {});
        this.setSettings(raw.settings);
        this.device = Object.assign(raw.device, await getDeviceInfo());
        return this;
    }

    dispatch(eventName: string, detail?: any) {
        this.dispatchEvent(new CustomEvent(eventName, { detail: detail }));
    }

    async load() {
        try {
            await this.storage.get(this);
        } catch (e) {}
        if (!this.device.id) {
            this.device.id = uuid();
        }
        await this.storage.set(this);
        this.dispatch("load");
    }

    get items(): ListItem[] {
        const recentCount = 0;

        const { vault, tag, text } = this.filter;

        if (!this.mainVault) {
            return [];
        }
        let items: ListItem[] = [];

        for (const s of vault ? [vault] : this.vaults) {
            for (const item of s.items) {
                if ((!tag || item.tags.includes(tag)) && filterByString(text || "", item)) {
                    items.push({
                        vault: s,
                        item: item,
                        section: "",
                        firstInSection: false,
                        lastInSection: false
                        // TODO: reimplement
                        // warning: !!vault.getOldMembers(item).length
                    });
                }
            }
        }

        const recent = items
            .sort((a, b) => {
                return (b.item.lastUsed || b.item.updated).getTime() - (a.item.lastUsed || a.item.updated).getTime();
            })
            .slice(0, recentCount);

        items = items.slice(recentCount);

        items = recent.concat(
            items.sort((a, b) => {
                const x = a.item.name.toLowerCase();
                const y = b.item.name.toLowerCase();
                return x > y ? 1 : x < y ? -1 : 0;
            })
        );

        for (let i = 0, prev, curr; i < items.length; i++) {
            prev = items[i - 1];
            curr = items[i];

            curr.section =
                i < recentCount
                    ? $l("Recently Used")
                    : (curr.item && curr.item.name[0] && curr.item.name[0].toUpperCase()) || $l("No Name");

            curr.firstInSection = !prev || prev.section !== curr.section;
            prev && (prev.lastInSection = curr.section !== prev.section);
        }

        return items;
    }

    async setStats(obj: Partial<Stats>) {
        Object.assign(this.stats, obj);
        this.storage.set(this);
        this.dispatch("stats-changed", { stats: this.stats });
    }

    async setSettings(obj: Partial<Settings>) {
        Object.assign(this.settings, obj);
        this.storage.set(this);
        this.dispatch("settings-changed", { settings: this.settings });
    }

    async initialize(password: string) {
        await this.setPassword(password);
        this.initialized = new Date().toISOString();
        await this.storage.set(this);
        this.dispatch("initialize");
        this.unlock(password);
    }

    async unlock(password: string) {
        await this.account!.unlock(password);
        await this.loadVaults();
        this.dispatch("unlock");
    }

    async getVault({ id }: { id: string }, fetch = false): Promise<Vault | null> {
        let vault = this._vaults.get(id);

        if (!vault) {
            vault = new Vault(id);
            vault.access(this.account!);

            try {
                await this.storage.get(vault);
            } catch (e) {
                if (e.code !== ErrorCode.NOT_FOUND) {
                    throw e;
                }
                if (!fetch) {
                    return null;
                }
            }
        }

        if (fetch) {
            try {
                const remoteVault = new Vault(id);
                remoteVault.access(this.account!);
                await this.api.getVault(remoteVault);
                vault.merge(remoteVault);
            } catch (e) {
                if (e.code !== ErrorCode.NOT_FOUND) {
                    throw e;
                }
                return null;
            }
        }

        this._vaults.set(id, vault);

        return vault;
    }

    async loadVaults() {
        if (!this.account) {
            return;
        }

        this._vaults.clear();

        for (const vaultInfo of this.account.vaults) {
            await this.getVault(vaultInfo);
        }

        for (const vault of this._vaults.values()) {
            if (vault === this.mainVault) {
                continue;
            }
            const parent = vault.parent ? await this.getVault(vault.parent) : this.mainVault;
            if (!(await parent!.verifySubVault(vault))) {
                throw new Err(ErrorCode.PUBLIC_KEY_MISMATCH);
            }
        }
    }

    async lock() {
        this.account!.lock();
        this._vaults.clear();
        this.dispatch("lock");
    }

    async setPassword(_password: string) {
        // TODO
        // this.password = password;
        // await this.storage.set(this.mainVault!);
        // this.dispatch("password-changed");
    }

    async save() {
        const promises = [this.storage.set(this)];
        promises.push(...this.vaults.map(s => this.storage.set(s)));
        return promises;
    }

    async reset() {
        this._vaults.clear();
        this.initialized = "";
        await this.storage.clear();
        this.dispatch("reset");
        this.loaded = this.load();
    }

    async addItems(items: VaultItem[], vault: Vault = this.mainVault!) {
        vault.items.update(...items);
        await this.storage.set(vault);
        this.dispatch("items-added", { vault, items });
    }

    async createItem(name: string, vault_?: Vault, fields?: Field[], tags?: Tag[]): Promise<VaultItem> {
        const vault = vault_ || this.mainVault!;
        fields = fields || [
            { name: $l("Username"), value: "", masked: false },
            { name: $l("Password"), value: "", masked: true }
        ];
        const item = createVaultItem(name || "", fields, tags);
        if (this.account) {
            item.updatedBy = this.account.id;
        }
        await this.addItems([item], vault);
        this.dispatch("item-created", { vault, item });
        return item;
    }

    async updateItem(vault: Vault, item: VaultItem, upd: { name?: string; fields?: Field[]; tags?: Tag[] }) {
        for (const prop of ["name", "fields", "tags"]) {
            if (typeof upd[prop] !== "undefined") {
                item[prop] = upd[prop];
            }
        }
        item.updated = new Date();
        if (this.account) {
            item.updatedBy = this.account.id;
        }
        await this.storage.set(vault);
        this.dispatch("item-changed", { vault: vault, item: item });
    }

    async deleteItems(vault: Vault, items: VaultItem[]) {
        vault.items.remove(...items);
        if (this.account) {
            for (const item of items) {
                item.updatedBy = this.account.id;
            }
        }
        await this.storage.set(vault);
        this.dispatch("items-deleted", { vault: vault, items: items });
    }

    async verifyEmail(email: string) {
        return this.api.verifyEmail({ email });
    }

    async signup(email: string, password: string, name: string, emailVerification: { id: string; code: string }) {
        const account = new Account();
        account.email = email;
        account.name = name;
        await account.initialize(password);

        const auth = new Auth(email);
        const authKey = await auth.getAuthKey(password);

        const srp = new SRPClient();
        await srp.initialize(authKey);

        auth.verifier = srp.v!;

        await this.api.createAccount({
            account,
            auth,
            emailVerification
        });

        await this.login(email, password);
    }

    async login(email: string, password: string) {
        const { auth, B } = await this.api.initAuth({ email });
        const authKey = await auth.getAuthKey(password);

        const srp = new SRPClient();

        await srp.initialize(authKey);
        await srp.setB(B);

        this.session = await this.api.createSession({ account: auth.account, A: srp.A!, M: srp.M1! });
        this.session.key = srp.K!;

        this.account = await this.api.getAccount(new Account(auth.account));

        await this.account.unlock(password);

        const mainVault = await this.getVault({ id: this.account.mainVault }, true);
        if (!mainVault!.initialized) {
            await mainVault!.initialize(this.account);
            await this.api.updateVault(mainVault!);
        }

        await this.synchronize();

        this.dispatch("login");
        this.dispatch("unlock");
        this.dispatch("account-changed", { account: this.account });
        this.dispatch("session-changed", { session: this.session });
    }

    async revokeSession(session: Session) {
        await this.api.revokeSession(session);
        await this.syncAccount();
        this.dispatch("account-changed", { account: this.account });
    }

    async syncAccount() {
        const account = this.account!;
        const remoteAccount = await this.api.getAccount(new Account(account.id));
        const changes = account.merge(remoteAccount);
        for (const vault of changes.vaults.removed) {
            this._vaults.delete(vault.id);
            await this.storage.delete(new Vault(vault.id));
            this.account!.vaults.remove(vault);
        }
        await this.storage.set(this);
        this.dispatch("account-changed", { account: this.account });
    }

    async logout() {
        try {
            await this.api.revokeSession(this.session!);
        } catch (e) {}

        this.session = null;
        this.account = null;
        await this.storage.clear();
        this._vaults.clear();
        await this.storage.set(this);
        this.dispatch("lock");
        this.dispatch("logout");
        this.dispatch("account-changed", { account: this.account });
        this.dispatch("session-changed", { session: this.session });
    }

    async createVault(name: string, parent?: Vault): Promise<Vault> {
        const vault = await this.api.createVault({ name });
        await vault.initialize(this.account!);

        if (parent) {
            vault.parent = parent.info;
        }

        this._vaults.set(vault.id, vault);

        await this.syncVault(vault);

        const addToVault = parent || this.mainVault;

        if (addToVault) {
            await addToVault.addSubVault(vault.info);
            await this.syncVault(addToVault);
        }

        await this.syncAccount();

        this.dispatch("vault-created", { vault });
        return vault;
    }

    async createInvite(vault: Vault, email: string) {
        const invite = await vault.createInvite(email);
        await vault.invites.update(invite);
        await this.syncVault(vault);
        return invite;
    }

    async getInvite(vault: string, id: string) {
        return await this.api.getInvite({ vault, id });
    }

    async acceptInvite(invite: Invite, secret: string) {
        const success = await invite.accept(this.account!.info, secret);
        if (success) {
            await this.api.acceptInvite(invite);
            await this.mainVault!.addSubVault({ ...invite.vault! } as VaultInfo);
            await this.syncVault(this.mainVault!);
        }
        return success;
    }

    async deleteInvite(invite: Invite) {
        const vault = await this.getVault(invite.vault!);
        if (!vault) {
            throw "Vault not found";
        }
        await vault.invites.remove(invite);
        await this.syncVault(vault);
    }

    async synchronize() {
        await this.syncAccount();
        await this.syncVaults();
        await this.storage.set(this);
        this.setStats({ lastSync: new Date().toISOString() });
        this.dispatch("synchronize");
    }

    async syncVaults() {
        await Promise.all([...this.account!.vaults].map(g => this.syncVault(g)));
    }

    async syncVault(vaultInfo: { id: string }): Promise<void> {
        const localVault = await this.getVault(vaultInfo);

        const remoteVault = new Vault(vaultInfo.id);
        remoteVault.access(this.account!);

        try {
            await this.api.getVault(remoteVault);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND && localVault) {
                this._vaults.delete(localVault.id);
                await this.storage.delete(localVault);
                this.account!.vaults.remove(localVault);
            }
        }

        let result: Vault;

        if (localVault) {
            result = new Vault();
            result.access(this.account!);
            await result.deserialize(await localVault!.serialize());
            result.merge(remoteVault);
        } else {
            result = remoteVault;
        }

        try {
            await this.api.updateVault(result);
        } catch (e) {
            if (e.code === ErrorCode.MERGE_CONFLICT) {
                return this.syncVault(vaultInfo);
            }
            throw e;
        }

        await this.storage.set(result);
        this._vaults.set(vaultInfo.id, result);

        this.dispatch("vault-changed", { result });
    }

    getItem(id: string): { item: VaultItem; vault: Vault } | null {
        for (const vault of [this.mainVault!, ...this.vaults]) {
            const item = vault.items.get(id);
            if (item) {
                return { item, vault };
            }
        }

        return null;
    }
}
