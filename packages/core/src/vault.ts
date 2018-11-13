import { Base64String, Serializable } from "./encoding";
import {
    SharedContainer,
    RSAPublicKey,
    RSAPrivateKey,
    RSASigningParams,
    getProvider,
    defaultRSAKeyParams,
    defaultRSASigningParams,
    AESKey
} from "./crypto";
import { uuid } from "./util";
import { Account, AccountInfo, SignedAccountInfo, AccountID } from "./account";
import { Invite, InviteCollection } from "./invite";
import { Err, ErrorCode } from "./error";
import { Storable } from "./storage";
import { Collection, CollectionItem, CollectionChanges } from "./collection";

export type MemberStatus = "active" | "removed" | "left";

export interface Permissions {
    read: boolean;
    write: boolean;
    manage: boolean;
}

export interface VaultMember extends SignedAccountInfo, CollectionItem {
    permissions: Permissions;
}

export interface VaultInfo {
    id: string;
    name: string;
    publicKey: RSAPublicKey;
}

export interface SignedVaultInfo extends VaultInfo {
    signedPublicKey: Base64String;
}

export interface SubVault extends SignedVaultInfo, CollectionItem {}

export type Tag = string;
export type ItemID = string;

export interface Field {
    name: string;
    value: string;
    masked?: boolean;
}

export function normalizeTag(tag: string): Tag {
    return tag.replace(",", "");
}

export interface VaultItem extends CollectionItem {
    id: ItemID;
    name: string;
    fields: Field[];
    tags: Tag[];
    updatedBy: AccountID;
    lastUsed: Date;
}

export function createVaultItem(name: string, fields?: Field[], tags?: Tag[]): VaultItem {
    return {
        id: uuid(),
        name: name,
        fields: fields || [],
        tags: tags || [],
        updated: new Date(),
        updatedBy: "",
        lastUsed: new Date()
    };
}

export class VaultItemCollection extends Collection<VaultItem> {
    get tags(): string[] {
        const tags = new Set<string>();
        for (const r of this) {
            for (const t of r.tags) {
                tags.add(t);
            }
        }
        return [...tags];
    }

    deserialize(raw: any) {
        return super.deserialize({
            ...raw,
            items: raw.items.map((item: any) => {
                return { ...item, lastUsed: new Date(item.lastUsed) };
            })
        });
    }
}

export class Vault implements VaultInfo, Storable {
    kind = "vault";
    owner: AccountID = "";
    created = new Date(0);
    updated = new Date(0);
    parent: VaultInfo | null = null;
    items = new VaultItemCollection();
    members = new Collection<VaultMember>();
    vaults = new Collection<SubVault>();
    invites = new InviteCollection();
    revision: {
        id: string;
        date: Date;
        mergedFrom?: [string, string];
    } = { id: uuid(), date: new Date() };

    get pk() {
        return this.id;
    }

    get name() {
        return this._name;
    }

    set name(name) {
        this._name = name;
        this.updated = new Date();
    }

    get publicKey() {
        return this._publicKey;
    }

    set publicKey(publicKey) {
        this._publicKey = publicKey;
        this.updated = new Date();
    }

    get info(): VaultInfo {
        return {
            id: this.id,
            name: this.name,
            publicKey: this.publicKey
        };
    }

    get initialized() {
        return !!this.publicKey;
    }

    protected _account: Account | null = null;
    protected _adminContainer: SharedContainer = new SharedContainer();

    private _publicKey: RSAPublicKey = "";
    private _privateKey: RSAPrivateKey = "";
    private _invitesKey: AESKey = "";
    private _signingParams: RSASigningParams = defaultRSASigningParams();
    private _itemsContainer = new SharedContainer();

    constructor(public id = "", private _name = "") {}

    async initialize(account: Account) {
        this.access(account);
        this._invitesKey = await getProvider().generateKey({
            algorithm: "AES",
            keySize: 256
        });
        await this._generateKeyPair();
        await this.addMember(this._account!.info, { read: true, write: true, manage: true });
    }

    access(account: Account) {
        this._account = account;
        this._adminContainer.access(account);
        this._itemsContainer.access(account);
    }

    isOwner(account: AccountInfo | null = this._account) {
        return !!account && this.owner === account.id;
    }

    isAdmin(account: AccountInfo | null = this._account) {
        if (this.isOwner(account)) {
            return true;
        }

        const member = account && this.getMember(account);
        return !!member && member.permissions.manage;
    }

    isMember(account: AccountInfo | null = this._account) {
        return account && !!this.getMember(account);
    }

    isInvited(account: AccountInfo | null = this._account) {
        return !!account && !!this.getInviteByEmail(account.email);
    }

    getMember(account: AccountInfo) {
        return this.members.get(account.id);
    }

    getPermissions(acc?: AccountInfo | null) {
        acc = acc || this._account;

        if (!acc) {
            return { read: false, write: false, manage: false };
        } else if (this.isOwner(acc)) {
            return { read: true, write: true, manage: true };
        } else if (this.isMember(acc)) {
            return this.getMember(acc)!.permissions;
        } else if (this.isInvited(acc)) {
            return { read: true, write: false, manage: false };
        } else {
            return { read: false, write: false, manage: false };
        }
    }

    async addMember(account: AccountInfo, permissions: Permissions = { read: true, write: true, manage: false }) {
        const signedPublicKey = await getProvider().sign(this._privateKey, account.publicKey, this._signingParams);

        this.members.update({
            ...account,
            signedPublicKey,
            permissions,
            updated: new Date()
        });
    }

    async addSubVault(vault: VaultInfo) {
        const signedPublicKey = await getProvider().sign(this._privateKey, vault.publicKey, this._signingParams);

        this.vaults.update({
            ...vault,
            signedPublicKey,
            updated: new Date()
        });
    }

    async verify(subj: VaultMember | SubVault): Promise<boolean> {
        let verified = false;
        try {
            verified = await getProvider().verify(
                this.publicKey,
                subj.signedPublicKey,
                subj.publicKey,
                this._signingParams
            );
        } catch (e) {}
        return verified;
    }

    async verifySubVault(info: VaultInfo): Promise<boolean> {
        const subVault = this.vaults.get(info.id);
        return !!subVault && subVault.publicKey === info.publicKey && (await this.verify(subVault));
    }

    getInviteByEmail(em: string) {
        return [...this.invites].find(({ email }) => email === em);
    }

    async createInvite(email: string) {
        const invite = new Invite(email);
        await invite.initialize(this.info, this._account!.info, this._invitesKey);
        return invite;
    }

    merge(vault: this, { manage, write }: Partial<Permissions> = { manage: true, write: true }) {
        const changes: {
            members?: CollectionChanges<VaultMember>;
            vaults?: CollectionChanges<SubVault>;
            invites?: CollectionChanges<Invite>;
            items?: CollectionChanges<VaultItem>;
        } = {};

        if (manage) {
            if (vault.updated > this.updated) {
                this.parent = vault.parent;
                this.created = vault.created;
                this.owner = vault.owner;
                this.name = vault.name;
                this.publicKey = vault.publicKey;
                this.updated = vault.updated;

                if (!this._account || this._account.locked) {
                    this._adminContainer = vault._adminContainer;
                } else {
                    this._privateKey = vault._privateKey;
                    this._invitesKey = vault._invitesKey;
                }
            }

            changes.members = this.members.merge(vault.members);
            changes.vaults = this.vaults.merge(vault.vaults);
            changes.invites = this.invites.merge(vault.invites);
        }

        if (write) {
            if (!this._account || this._account.locked) {
                this._itemsContainer = vault._itemsContainer;
            } else {
                changes.items = this.items.merge(vault.items);
            }
        }

        this.revision = { id: uuid(), date: new Date(), mergedFrom: [this.revision.id, vault.revision.id] };

        return changes;
    }

    async serialize(): Promise<any> {
        const { manage, write } = this.getPermissions();
        const account = this._account!;

        if (manage && !account.locked) {
            // TODO: Do something about removed admins
            await this._adminContainer.setAccessors(
                [...this.members].filter(m => m.permissions.manage).map(({ id, publicKey }) => {
                    return { id, publicKey, encryptedKey: "" };
                })
            );
            await this._adminContainer.set(this._adminSerializer);
        }

        if (write && !account.locked) {
            // TODO: Do something about removed members
            await this._itemsContainer.setAccessors(
                [...this.members].map(({ id, publicKey }) => {
                    return { id, publicKey, encryptedKey: "" };
                })
            );
            await this._itemsContainer.set(this.items);
        }

        return {
            ...this.info,
            created: this.created,
            updated: this.updated,
            revision: this.revision,
            owner: this.owner,
            parent: this.parent,
            members: await this.members.serialize(),
            vaults: await this.vaults.serialize(),
            invites: await this.invites.serialize(),
            signingParams: this._signingParams,
            adminData: await this._adminContainer.serialize(),
            itemsData: await this._itemsContainer.serialize()
        };
    }

    async deserialize(raw: any) {
        this.id = raw.id;
        this.created = new Date(raw.created);
        this.updated = new Date(raw.updated);
        this.revision = { ...raw.revision, date: new Date(raw.revision.date) };
        this.owner = raw.owner;
        this.parent = raw.parent;
        this._name = raw.name;
        this._publicKey = raw.publicKey;

        // Verify signatures
        for (const subj of [...raw.members.items, ...raw.vaults.items]) {
            if (!(await this.verify(subj))) {
                throw new Err(ErrorCode.PUBLIC_KEY_MISMATCH);
            }
        }

        this._signingParams = raw.signingParams;

        this.members = await new Collection<VaultMember>().deserialize(raw.members);
        this.vaults = await new Collection<SubVault>().deserialize(raw.vaults);
        this.invites = await new InviteCollection().deserialize(raw.invites);

        await this._adminContainer.deserialize(raw.adminData);
        await this._itemsContainer.deserialize(raw.itemsData);

        // Load admin data
        if (this._account && !this._account.locked && this._adminContainer.hasAccess(this._account)) {
            await this._adminContainer.get(this._adminSerializer);
        }

        // Load collection data
        if (this._account && !this._account.locked && this._itemsContainer.hasAccess(this._account)) {
            await this._itemsContainer.get(this.items);
        }

        return this;
    }

    toString() {
        return this.parent ? `${this.parent.name}/${this.name}` : this.name;
    }

    private async _generateKeyPair() {
        const { publicKey, privateKey } = await getProvider().generateKey(defaultRSAKeyParams());
        this.publicKey = publicKey;
        this._privateKey = privateKey;
    }

    private get _adminSerializer(): Serializable {
        return {
            serialize: async () => {
                return {
                    publicKey: this.publicKey,
                    privateKey: this._privateKey,
                    invitesKey: this._invitesKey
                };
            },
            deserialize: async (raw: any) => {
                this._privateKey = raw.privateKey;
                if (raw.publicKey !== this.publicKey) {
                    throw new Err(ErrorCode.PUBLIC_KEY_MISMATCH);
                }
                this._invitesKey = raw.invitesKey;
                await Promise.all([...this.invites].map(invite => invite.accessSecret(this._invitesKey)));
                return this;
            }
        };
    }
}
