import { EventEmitter } from "./event-target";
import { Storage, Storable } from "./storage";
import { InvitePurpose } from "./invite";
import { Vault, VaultInfo, VaultMember, VaultItem, Field, Tag, createVaultItem } from "./vault";
import { CollectionItem } from "./collection";
import { Account } from "./account";
import { Auth } from "./auth";
import { Session } from "./session";
import { Invite } from "./invite";
import { DateString } from "./encoding";
import { API } from "./api";
import { Client } from "./client";
import { Sender } from "./transport";
import { localize as $l } from "./locale";
import { DeviceInfo, getDeviceInfo } from "./platform";
import { uuid, escapeRegex } from "./util";
import { Client as SRPClient } from "./srp";
import { Err, ErrorCode } from "./error";

export interface Stats {
    lastSync?: DateString;
    [key: string]: string | number | boolean | DateString | undefined;
}

export interface Settings {
    autoLock: boolean;
    autoLockDelay: number;
    customServer: boolean;
    customServerUrl: string;
    syncInterval: number;
}

const defaultSettings: Settings = {
    autoLock: true,
    autoLockDelay: 5,
    customServer: false,
    customServerUrl: "",
    syncInterval: 1
};

function filterByString(fs: string, rec: VaultItem) {
    if (!fs) {
        return true;
    }
    const content = [rec.name, ...rec.fields.map(f => f.name)].join(" ").toLowerCase();
    return content.search(escapeRegex(fs.toLowerCase())) !== -1;
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

export class App extends EventEmitter implements Storable {
    kind = "app";
    pk = "";

    version = "3.0";
    api: API;
    settings = defaultSettings;
    stats: Stats = {};
    device: DeviceInfo = {} as DeviceInfo;
    initialized: DateString = "";
    session: Session | null = null;
    account: Account | null = null;
    loaded = this.load();

    constructor(public storage: Storage, sender: Sender) {
        super();
        this.api = new Client(this, sender);
    }

    get locked() {
        return !this.account || !!this.account.locked;
    }

    get loggedIn() {
        return !!this.session;
    }

    get syncing() {
        return !!this._activeSyncPromises.size;
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

    get mainVault(): Vault | null {
        return (this.account && this._vaults.get(this.account.mainVault)) || null;
    }

    get vaults() {
        return [...this._vaults.values()].filter(v => !v.archived).sort((a, b) => {
            const nameA = a.toString();
            const nameB = b.toString();
            return b === this.mainVault || nameA > nameB ? 1 : a === this.mainVault || nameA < nameB ? -1 : 0;
        });
    }

    get archivedVaults() {
        return [...this._vaults.values()].filter(v => v.archived && !v.parent);
    }

    get filter() {
        return this._filter;
    }

    set filter(filter: FilterParams) {
        this._filter = filter;
        this.dispatch("filter-changed", filter);
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

    private _vaults = new Map<string, Vault>();
    private _filter: FilterParams = {};
    private _queuedSyncPromises = new Map<string, Promise<void>>();
    private _activeSyncPromises = new Map<string, Promise<void>>();

    async load() {
        try {
            await this.storage.get(this);
        } catch (e) {}
        if (!this.device.id) {
            this.device.id = uuid();
        }
        await this.storage.set(this);

        // Try syncing account so user can unlock with new password in case it has changed
        if (this.account) {
            this.syncAccount();
        }

        this.dispatch("load");
    }

    async unlock(password: string) {
        await this.account!.unlock(password);
        await this.loadVaults();
        this.dispatch("unlock");
        this.synchronize();
    }

    async lock() {
        this.account!.lock();
        this._vaults.clear();
        this.dispatch("lock");
    }

    // SESSION / ACCOUNT MANGAGEMENT

    async verifyEmail(email: string) {
        return this.api.verifyEmail(email);
    }

    async signup({
        email,
        password,
        name,
        verify,
        invite
    }: {
        email: string;
        password: string;
        name: string;
        verify: string;
        invite?: Invite;
    }) {
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
            verify,
            invite: invite && { id: invite.id, vault: invite.vault!.id }
        });

        await this.login(email, password);
    }

    async login(email: string, password: string) {
        const { auth, B } = await this.api.initAuth(email);
        const authKey = await auth.getAuthKey(password);

        const srp = new SRPClient();

        await srp.initialize(authKey);
        await srp.setB(B);

        this.session = await this.api.createSession({ account: auth.account, A: srp.A!, M: srp.M1! });
        this.session.key = srp.K!;

        this.account = await this.api.getAccount(new Account(auth.account));

        await this.account.unlock(password);

        const mainVault = await this.loadVault({ id: this.account.mainVault } as VaultInfo, true);
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

    async changePassword(password: string) {
        const account = this.account!;
        const oldPassword = account.password;
        await account.setPassword(password);

        try {
            await this.syncAccount();
            const auth = new Auth(account.email);
            auth.account = account.id;
            const authKey = await auth.getAuthKey(password);
            const srp = new SRPClient();
            await srp.initialize(authKey);
            auth.verifier = srp.v!;
            await this.api.updateAuth(auth);
        } catch (e) {
            // something went wrong. roll back password
            account.setPassword(oldPassword);
            throw e;
        }
    }

    async syncAccount() {
        return this._queueSync(this.account!, () => this._syncAccount());
    }

    async _syncAccount() {
        const account = this.account!;
        const remoteAccount = await this.api.getAccount(new Account(account.id));
        const changes = account.merge(remoteAccount);
        for (const vault of changes.vaults.removed) {
            this._vaults.delete(vault.id);
            await this.storage.delete(new Vault(vault.id));
            this.account!.vaults.remove(vault);
        }
        await this.api.updateAccount(account);
        await this.storage.set(this);
        this.dispatch("account-changed", { account: this.account });
    }

    async revokeSession(session: Session) {
        await this.api.revokeSession(session);
        await this.syncAccount();
        this.dispatch("account-changed", { account: this.account });
    }

    // VAULTS

    getVault(id: string) {
        return this._vaults.get(id) || null;
    }

    async createVault(name: string, parent?: Vault): Promise<Vault> {
        const vault = await this.api.createVault({ name });
        await vault.initialize(this.account!);

        if (parent) {
            vault.parent = parent.info;
        }

        this._vaults.set(vault.id, vault);

        await this.api.updateVault(vault);

        const addToVault = parent || this.mainVault;
        if (addToVault) {
            await addToVault.addSubVault(vault.info);
            await this.syncVault(addToVault);
        }

        await this.syncAccount();

        this.dispatch("vault-created", { vault });
        return vault;
    }

    async updateVault(vault: Vault, { name }: Partial<Vault>): Promise<void> {
        if (name) {
            vault.name = name;
        }
        await this.syncVault(vault);
    }

    async deleteVault({ id }: Vault | VaultInfo): Promise<void> {
        await this.api.deleteVault(new Vault(id));
        await this.synchronize();
    }

    async archiveVault({ id }: Vault | VaultInfo): Promise<void> {
        const vault = this.getVault(id)!;
        await Promise.all([...vault.vaults].map(v => this.archiveVault(v)));
        for (const invite of vault.invites) {
            vault.invites.remove(invite);
        }
        vault.archived = true;
        vault.updated = new Date();
        await this.syncVault(vault, false);
    }

    async unarchiveVault(vault: Vault | VaultInfo): Promise<void> {
        await this.reinitializeVault(vault);
    }

    async reinitializeVault({ id }: Vault | VaultInfo): Promise<void> {
        const vault = this.getVault(id)!;
        vault.archived = false;

        const parent = vault.parent && this.getVault(vault.parent.id);

        await vault.initialize(this.account!);

        if (parent) {
            // This is a subvault, so it's sufficient to update member signatures
            for (const member of vault.members) {
                // update member signatures
                await vault.addMember(member, member.permissions);
            }
            // update public key and signature in parent vault
            await parent.addSubVault(vault.info);
            vault.parent = parent.info;
        } else {
            // We're dealing with a main vault, so all memberships have to be reconfirmed
            for (const member of vault.members) {
                if (member.id !== this.account!.id) {
                    // members have to be reconfirmed through invites
                    vault.members.update({ ...member, suspended: true });
                    await vault.createInvite(member.email, "confirm_membership");
                }
            }

            // Reinitialize subvaults
            await Promise.all([...vault.vaults].map(v => this.reinitializeVault(v)));

            // Register vault with own main vault
            await this.mainVault!.addSubVault(vault.info);

            await this.syncVault(this.mainVault!);
        }

        await this.syncVault(vault, false);
    }

    async loadVault({ id }: Vault | VaultInfo, fetch = false): Promise<Vault | null> {
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
            await this.loadVault(vaultInfo);
        }

        // await Promise.all([...this._vaults.values()].map(vault => this.verifyVault(vault)));
    }

    async verifyVault(vault: Vault) {
        if (vault.id === this.account!.mainVault) {
            return true;
        }
        const parent = vault.parent ? this.getVault(vault.parent.id) : this.mainVault;
        if (!(await parent!.verifySubVault(vault.info))) {
            console.log("failed to verify vault", vault.info, parent!.info);
            throw new Err(ErrorCode.PUBLIC_KEY_MISMATCH);
        }

        for (const member of vault.members) {
            if (!member.suspended && !(await vault.verifyMember(member))) {
                throw new Err(ErrorCode.PUBLIC_KEY_MISMATCH);
            }
        }
    }

    async syncVault(vaultInfo: { id: string }, verify?: boolean): Promise<Vault> {
        return this._queueSync(vaultInfo, (vaultInfo: VaultInfo) => this._syncVault(vaultInfo, verify));
    }

    async syncVaults() {
        const parentVaults = [...this.account!.vaults].filter(v => v.id !== this.account!.mainVault && !v.parent);
        const subVaults = [...this.account!.vaults].filter(v => !!v.parent);
        await this.syncVault({ id: this.account!.mainVault });
        await Promise.all(parentVaults.map(g => this.syncVault(g)));
        await Promise.all(subVaults.map(g => this.syncVault(g)));
    }

    async _syncVault(vaultInfo: { id: string }, verify = true): Promise<Vault | null> {
        const localVault = this.getVault(vaultInfo.id);

        const remoteVault = new Vault(vaultInfo.id);
        remoteVault.access(this.account!);

        try {
            await this.api.getVault(remoteVault);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                if (localVault) {
                    await this.storage.delete(localVault);
                }
                this._vaults.delete(vaultInfo.id);
                this.account!.vaults.remove(vaultInfo as VaultInfo & CollectionItem);
                return null;
            } else {
                throw e;
            }
        }

        if (verify && !remoteVault.isSuspended() && !remoteVault.archived) {
            await this.verifyVault(remoteVault);
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

        // Only update if there are local changes and if the vault is not archived
        if (!result.archived && result.revision.id !== remoteVault.revision.id) {
            try {
                await this.api.updateVault(result);
            } catch (e) {
                if (e.code === ErrorCode.MERGE_CONFLICT) {
                    // If there is a merge conflict (probably because somebody else
                    // did a push while we were sycing), start over.
                    return this._syncVault(vaultInfo);
                }
                throw e;
            }
        }

        await this.storage.set(result);
        this._vaults.set(vaultInfo.id, result);

        this.dispatch("vault-changed", { vault: result });

        return result;
    }

    // VAULT ITEMS

    getItem(id: string): { item: VaultItem; vault: Vault } | null {
        for (const vault of [this.mainVault!, ...this.vaults]) {
            const item = vault.items.get(id);
            if (item) {
                return { item, vault };
            }
        }

        return null;
    }

    async addItems(items: VaultItem[], vault: Vault = this.mainVault!) {
        vault.items.update(...items);
        this.dispatch("items-added", { vault, items });
        await this.storage.set(vault);
        await this.syncVault(vault);
    }

    async createItem(name: string, vault_?: Vault, fields?: Field[], tags?: Tag[]): Promise<VaultItem> {
        const vault = vault_ || this.mainVault!;
        fields = fields || [
            { name: $l("Username"), value: "", type: "username" },
            { name: $l("Password"), value: "", type: "password" },
            { name: $l("URL"), value: "", type: "url" }
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
        vault.items.update({ ...item, ...upd, updatedBy: this.account!.id });
        this.dispatch("item-changed", { vault, item });
        await this.storage.set(vault);
        await this.syncVault(vault);
    }

    async deleteItems(items: { item: VaultItem; vault: Vault }[]) {
        const grouped = new Map<Vault, VaultItem[]>();
        for (const item of items) {
            if (!grouped.has(item.vault)) {
                grouped.set(item.vault, []);
            }
            grouped.get(item.vault)!.push(item.item);
        }
        for (const [vault, items] of grouped.entries()) {
            vault.items.remove(...items);
            await this.storage.set(vault);
            this.dispatch("items-deleted", { vault, items });
            await this.syncVault(vault);
        }
    }

    async moveItems(items: { item: VaultItem; vault: Vault }[], target: Vault) {
        const newItems = items.map(i => ({ ...i.item, id: uuid() }));
        await this.addItems(newItems, target);
        await this.deleteItems(items);
        return newItems;
    }

    // INVITES

    async createInvite(vault: Vault, email: string, purpose?: InvitePurpose) {
        const invite = await vault.createInvite(email, purpose);
        this.dispatch("invite-created", { invite });
        await this.syncVault(vault);
        return invite;
    }

    async getInvite(vaultId: string, id: string) {
        let vault = this.getVault(vaultId);
        if (vault) {
            vault = await this.syncVault(vault);
            return vault.invites.get(id);
        } else {
            try {
                return await this.api.getInvite({ vault: vaultId, id });
            } catch (e) {
                return null;
            }
        }
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

    async confirmInvite(invite: Invite) {
        const vault = this.getVault(invite!.vault!.id)!;
        let permissions;
        if (invite.purpose === "confirm_membership") {
            const existing = vault.members.get(invite!.invitee!.id);
            permissions = (existing && existing.permissions) || undefined;
        }
        await vault!.addMember(invite!.invitee!, permissions);
        vault!.invites.remove(invite!);
        await this.syncVault(vault);
    }

    // SETTINGS / STATS

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

    // MISC
    async removeMember(vault: Vault, member: VaultMember): Promise<any> {
        for (const { id } of vault.vaults) {
            const subVault = this.getVault(id)!;
            if (subVault.members.get(member.id)) {
                await this.removeMember(subVault, member);
            }
        }
        vault.members.remove(member);
        await this.syncVault(vault);
    }

    async synchronize() {
        await this.syncAccount();
        await this.syncVaults();
        await this.storage.set(this);
        this.setStats({ lastSync: new Date().toISOString() });
        this.dispatch("synchronize");
    }

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

    async _queueSync(obj: { id: string }, fn: (obj: { id: string }) => Promise<any>): Promise<any> {
        let queued = this._queuedSyncPromises.get(obj.id);
        let active = this._activeSyncPromises.get(obj.id);

        if (queued) {
            // There is already a queued sync promise, so just return that one
            return queued;
        }

        if (active) {
            // There is already a synchronization in process. wait for the current sync to finish
            // before starting a new one.
            const next = () => {
                this._queuedSyncPromises.delete(obj.id);
                return this._queueSync(obj, fn);
            };
            queued = active.then(next, next);
            this._queuedSyncPromises.set(obj.id, queued);
            return queued;
        }

        this.dispatch("start-sync", obj);
        active = fn(obj).then(
            (result: any) => {
                this._activeSyncPromises.delete(obj.id);
                this.dispatch("finish-sync", obj);
                return result;
            },
            e => {
                this._activeSyncPromises.delete(obj.id);
                this.dispatch("finish-sync", obj);
                throw e;
            }
        );
        this._activeSyncPromises.set(obj.id, active);
        return active;
    }
}
