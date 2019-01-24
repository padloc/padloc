import { Base64String, Serializable, marshal, unmarshal, stringToBase64, base64ToString } from "./encoding";
import {
    RSAPublicKey,
    RSAPrivateKey,
    RSASigningParams,
    getProvider,
    defaultRSAKeyParams,
    defaultRSASigningParams,
    AESKey
} from "./crypto";
import { SharedContainer } from "./container";
import { uuid } from "./util";
import { Account, AccountInfo, SignedAccountInfo, AccountID } from "./account";
import { Invite, InvitePurpose, InviteCollection } from "./invite";
import { Err, ErrorCode } from "./error";
import { Storable } from "./storage";
import { Collection, CollectionItem, CollectionChanges } from "./collection";
import { VaultItemCollection, VaultItem } from "./item";

export type MemberStatus = "active" | "removed" | "left";

export interface Permissions {
    read: boolean;
    write: boolean;
    manage: boolean;
}

export interface VaultMember extends SignedAccountInfo, CollectionItem {
    permissions: Permissions;
    suspended?: boolean;
}

export interface VaultInfo {
    id: string;
    name: string;
    publicKey: RSAPublicKey;
    parent?: string;
}

export interface SignedVaultInfo extends VaultInfo {
    signedPublicKey: Base64String;
}

export interface SubVault extends SignedVaultInfo, CollectionItem {}

export class Vault implements Storable {
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
    archived = false;

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

    get info(): VaultInfo {
        return {
            id: this.id,
            name: this.name,
            publicKey: this.publicKey,
            parent: (this.parent && this.parent.id) || undefined
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
        // Remove all existing invites since we've updated the invites key
        for (const invite of this.invites) {
            this.invites.remove(invite);
        }
        await this._generateKeyPair();
        await this.addMember(this._account!.info, { read: true, write: true, manage: true });
        this.updated = new Date();
    }

    async reinitialize(account: Account) {
        // remove existing invites
        for (const invite of this.invites) {
            this.invites.remove(invite);
        }

        this._adminContainer = new SharedContainer();
        if (!this.hasItemsAccess()) {
            this._itemsContainer = new SharedContainer();
        }
        await this.initialize(account);
    }

    access(account: Account) {
        this._account = account;
        this._adminContainer.access(account);
        this._itemsContainer.access(account);
    }

    hasItemsAccess(account: AccountInfo | null = this._account) {
        return !!account && this._itemsContainer.hasAccess(account);
    }

    hasAdminAccess(account: AccountInfo | null = this._account) {
        return !!account && this._adminContainer.hasAccess(account);
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

    isSuspended(account: AccountInfo | null = this._account) {
        const member = account && this.getMember(account);
        return !!member && member.suspended;
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
            updated: new Date(),
            suspended: false
        });

        this.updated = new Date();
    }

    async addSubVault(vault: VaultInfo) {
        const signedPublicKey = await getProvider().sign(this._privateKey, vault.publicKey, this._signingParams);

        this.vaults.update({
            ...vault,
            signedPublicKey,
            updated: new Date()
        });

        this.updated = new Date();
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

    async verifyMember(acc: AccountInfo): Promise<boolean> {
        const member = this.members.get(acc.id);
        return !!member && member.publicKey === acc.publicKey && (await this.verify(member));
    }

    async verifySubVault(info: VaultInfo): Promise<boolean> {
        const subVault = this.vaults.get(info.id);
        return !!subVault && subVault.publicKey === info.publicKey && (await this.verify(subVault));
    }

    getInviteByEmail(em: string) {
        return [...this.invites].find(({ email }) => email === em);
    }

    async createInvite(email: string, purpose?: InvitePurpose) {
        const invite = new Invite(email, purpose);
        await invite.initialize(this.info, this._account!.info, this._invitesKey);
        this.invites.update(invite);
        return invite;
    }

    merge(vault: this, { manage, write }: Partial<Permissions> = { manage: true, write: true }) {
        const changes: {
            members?: CollectionChanges<VaultMember>;
            vaults?: CollectionChanges<SubVault>;
            invites?: CollectionChanges<Invite>;
            items?: CollectionChanges<VaultItem>;
        } = {};

        let forwardChanges = false;

        // Owner and created are supposed to be immutable so only copy over
        // if not set yet. (Which should happen exactly once after creation)
        this.owner = this.owner || vault.owner;
        this.created = this.created || vault.created;

        if (manage) {
            if (vault.updated > this.updated) {
                this.parent = vault.parent;
                this.name = vault.name;
                this._publicKey = vault._publicKey;
                this.archived = vault.archived;
                this.updated = vault.updated;
            } else if (this.updated > vault.updated) {
                forwardChanges = true;
            }

            this._adminContainer = vault._adminContainer;

            if (this._account && !this._account.locked && vault.hasAdminAccess(this._account)) {
                if (vault.updated > this.updated || !this._privateKey) {
                    this._privateKey = vault._privateKey;
                }
                if (vault.updated > this.updated || !this._invitesKey) {
                    this._invitesKey = vault._invitesKey;
                }
            }

            changes.members = this.members.merge(vault.members);
            changes.vaults = this.vaults.merge(vault.vaults);
            changes.invites = this.invites.merge(vault.invites);
            if (
                this.members.revision.id !== vault.members.revision.id ||
                this.vaults.revision.id !== vault.vaults.revision.id ||
                this.invites.revision.id !== vault.invites.revision.id
            ) {
                forwardChanges = true;
            }
        }

        if (write) {
            this._itemsContainer = vault._itemsContainer;

            if (this._account && !this._account.locked && vault.hasItemsAccess(this._account)) {
                changes.items = this.items.merge(vault.items);
                if (this.items.revision.id !== vault.items.revision.id) {
                    forwardChanges = true;
                }
            }
        }

        if (forwardChanges) {
            this.revision = { id: uuid(), date: new Date(), mergedFrom: [this.revision.id, vault.revision.id] };
        } else {
            this.revision = vault.revision;
        }

        return changes;
    }

    async serialize(): Promise<any> {
        const { manage, write } = this.getPermissions();
        const account = this._account!;

        if (this.hasAdminAccess() && manage && !account.locked && !this.isSuspended()) {
            // TODO: Do something about removed admins
            await this._adminContainer.setAccessors(
                [...this.members].filter(m => m.permissions.manage && !m.suspended).map(({ id, publicKey }) => {
                    return { id, publicKey, encryptedKey: "" };
                })
            );
            const adminData = stringToBase64(marshal(await this._adminSerializer.serialize()));
            await this._adminContainer.set(adminData);
        }

        if (this.hasItemsAccess() && write && !account.locked && !this.isSuspended()) {
            await this._itemsContainer.setAccessors(
                [...this.members].filter(m => !m.suspended).map(({ id, publicKey }) => {
                    return { id, publicKey, encryptedKey: "" };
                })
            );
            const itemsData = stringToBase64(marshal(await this.items.serialize()));
            await this._itemsContainer.set(itemsData);
        }

        return {
            id: this.id,
            name: this.name,
            publicKey: this.publicKey,
            created: this.created,
            updated: this.updated,
            revision: this.revision,
            owner: this.owner,
            archived: this.archived,
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
        this.archived = !!raw.archived;
        this.parent = raw.parent;
        this._name = raw.name;
        this._publicKey = raw.publicKey;
        this._signingParams = raw.signingParams;

        this.members = await new Collection<VaultMember>().deserialize(raw.members);
        this.vaults = await new Collection<SubVault>().deserialize(raw.vaults);
        this.invites = await new InviteCollection().deserialize(raw.invites);

        await this._adminContainer.deserialize(raw.adminData);
        await this._itemsContainer.deserialize(raw.itemsData);

        // Load admin data
        if (!this.archived && this.hasAdminAccess() && this._account && !this._account.locked) {
            const adminData = unmarshal(base64ToString(await this._adminContainer.get()));
            await this._adminSerializer.deserialize(adminData);
        }

        // Load collection data
        if (!this.archived && this.hasItemsAccess() && this._account && !this._account.locked) {
            const itemsData = unmarshal(base64ToString(await this._itemsContainer.get()));
            await this.items.deserialize(itemsData);
        }

        return this;
    }

    toString() {
        return this.parent ? `${this.parent.name}/${this.name}` : this.name;
    }

    private async _generateKeyPair() {
        const { publicKey, privateKey } = await getProvider().generateKey(defaultRSAKeyParams());
        this._publicKey = publicKey;
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
                await Promise.all(
                    [...this.invites].map(invite => {
                        try {
                            invite.accessSecret(this._invitesKey);
                        } catch (e) {}
                    })
                );
                return this;
            }
        };
    }
}
