import { Base64String, DateString, Serializable } from "./encoding";
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
import { Account, AccountInfo, SignedAccountInfo, AccountID } from "./auth";
import { Invite } from "./invite";
import { Err, ErrorCode } from "./error";
import { Storable } from "./storage";
import { Collection } from "./data";

export type MemberStatus = "active" | "removed";

export interface Permissions {
    read: boolean;
    write: boolean;
    manage: boolean;
}

export interface VaultMember extends SignedAccountInfo {
    permissions: Permissions;
    status: MemberStatus;
    updated: DateString;
}

export interface VaultInfo {
    id: string;
    name: string;
    publicKey: RSAPublicKey;
}

export interface SignedVaultInfo extends VaultInfo {
    signedPublicKey: Base64String;
}

export interface SubVault extends SignedVaultInfo {
    updated: DateString;
}

export class Vault implements VaultInfo, Storable {
    kind = "vault";
    owner: AccountID = "";
    publicKey: RSAPublicKey = "";
    created: DateString = new Date().toISOString();
    parent: VaultInfo | null = null;
    collection = new Collection();

    get pk() {
        return this.id;
    }

    get info(): VaultInfo {
        return {
            id: this.id,
            name: this.name,
            publicKey: this.publicKey
        };
    }

    get members() {
        return Array.from(this._members.values());
    }

    get vaults() {
        return Array.from(this._vaults.values());
    }

    get invites() {
        return Array.from(this._invites.values());
    }

    get initialized() {
        return !!this.publicKey;
    }

    protected _account: Account | null = null;
    protected _adminContainer: SharedContainer = new SharedContainer();

    private _privateKey: RSAPrivateKey = "";
    private _members: Map<string, VaultMember> = new Map<string, VaultMember>();
    private _vaults: Map<string, SubVault> = new Map<string, SubVault>();
    private _invites = new Map<string, Invite>();
    private _invitesKey: AESKey = "";
    private _signingParams: RSASigningParams = defaultRSASigningParams();
    private _collectionContainer = new SharedContainer();

    constructor(public id = "", public name = "") {
        this._adminContainer = new SharedContainer();
    }

    async initialize(account: Account) {
        this.access(account);
        this._invitesKey = await getProvider().generateKey({
            algorithm: "AES",
            keySize: 256
        });
        await this._generateKeyPair();
        await this._setMember(this._account!.info, "active", { read: true, write: true, manage: true });
    }

    access(account: Account) {
        this._account = account;
        this._adminContainer.access(account);
        this._collectionContainer.access(account);
    }

    isOwner(account?: AccountInfo) {
        const acc = account || this._account;
        return !!acc && this.owner === acc.id;
    }

    isAdmin(account?: AccountInfo) {
        const member = this.getMember(account);
        return member && member.permissions.manage;
    }

    isMember(account?: AccountInfo) {
        return !!this.getMember(account);
    }

    isInvited(account: AccountInfo) {
        return !!this.invites.find(({ email }) => email === account.email);
    }

    getMember(account?: AccountInfo) {
        const acc = account || this._account;
        if (!acc) {
            return null;
        }
        return this._members.get(acc.id);
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

    async updateMember(account: AccountInfo, status: MemberStatus, permissions: Permissions) {
        return this._setMember(account, status, permissions);
    }

    async removeMember(account: AccountInfo) {
        if (!this.isMember(account)) {
            throw "Not a member!";
        }
        return this._setMember(account, "removed", { read: false, write: false, manage: false });
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
        const subVault = this._vaults.get(info.id);
        return !!subVault && subVault.publicKey === info.publicKey && (await this.verify(subVault));
    }

    getInvite(email: string) {
        return this._invites.get(email);
    }

    async createInvite(email: string) {
        if (!this._account || !this.isAdmin(this._account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const invite = new Invite(email);
        await invite.initialize(this.info, this._account.info, this._invitesKey);
        return invite;
    }

    updateInvite(invite: Invite) {
        this._invites.set(invite.email, invite);
    }

    deleteInvite(invite: Invite) {
        this._invites.delete(invite.email);
    }

    async addVault(vault: VaultInfo) {
        if (this._vaults.has(vault.id)) {
            throw "Already a subvault";
        }
        return this._setSubVault(vault);
    }

    async updateVault(vault: VaultInfo) {
        if (this._vaults.has(vault.id)) {
            throw "Not a subvault";
        }
        return this._setSubVault(vault);
    }

    async removeVault(vault: VaultInfo) {
        if (this._vaults.has(vault.id)) {
            throw "Not a subvault";
        }
        this._vaults.delete(vault.id);
    }

    update(vault: this) {
        const { manage, write } = this.getPermissions();

        if (manage) {
            this.name = vault.name;
            this.publicKey = vault.publicKey;
            this.parent = vault.parent;
            this._adminContainer = vault._adminContainer;
            this._mergeMembers(vault.members);
            this._mergeVaults(vault.vaults);
        }

        if (write) {
            this._collectionContainer = vault._collectionContainer;
        }
    }

    async serialize(): Promise<any> {
        const { manage, write } = this.getPermissions();
        const account = this._account!;

        if (manage && account.privateKey) {
            // TODO: Do something about removed admins
            await this._adminContainer.setAccessors(
                this.members.filter(m => m.status === "active" && m.permissions.manage).map(({ id, publicKey }) => {
                    return { id, publicKey, encryptedKey: "" };
                })
            );
            await this._adminContainer.set(this._adminSerializer);
        }

        if (write && account.privateKey) {
            // TODO: Do something about removed members
            await this._collectionContainer.setAccessors(
                this.members.filter(m => m.status === "active").map(({ id, publicKey }) => {
                    return { id, publicKey, encryptedKey: "" };
                })
            );
            await this._collectionContainer.set(this.collection);
        }

        return Object.assign(this.info, {
            created: this.created,
            owner: this.owner,
            parent: this.parent,
            members: this.members,
            vaults: this.vaults,
            invites: await Promise.all(this.invites.map(i => i.serialize())),
            signingParams: this._signingParams,
            adminData: await this._adminContainer.serialize(),
            collectionData: await this._collectionContainer.serialize()
        });
    }

    async deserialize(raw: any) {
        this.id = raw.id;
        this.created = raw.created;
        this.owner = raw.owner;
        this.parent = raw.parent;
        this.name = raw.name;
        this.publicKey = raw.publicKey;
        // Verify signatures
        for (const subj of raw.members.concat(raw.vaults)) {
            if (!(await this.verify(subj))) {
                throw new Err(ErrorCode.PUBLIC_KEY_MISMATCH);
            }
        }
        this._mergeMembers(raw.members);
        this._mergeVaults(raw.vaults);
        this._signingParams = raw.signingParams;
        this._invites.clear();
        await Promise.all(
            raw.invites.map(async (invite: any) => {
                this._invites.set(invite.email, await new Invite().deserialize(invite));
            })
        );

        if (!this._account || this._account.locked) {
            return this;
        }

        // Load admin data
        await this._adminContainer.deserialize(raw.adminData);
        if (this._adminContainer.hasAccess(this._account)) {
            await this._adminContainer.get(this._adminSerializer);
        }

        // Load collection data
        await this._collectionContainer.deserialize(raw.collectionData);
        if (this._collectionContainer.hasAccess(this._account)) {
            await this._collectionContainer.get(this.collection);
        }
        return this;
    }

    protected _mergeMembers(members: VaultMember[]) {
        for (const member of members) {
            const existing = this.getMember(member);
            if (!existing || new Date(member.updated) > new Date(existing.updated)) {
                this._members.set(member.id, member);
            }
        }
    }

    protected _mergeVaults(vaults: SubVault[]) {
        for (const vault of vaults) {
            const existing = this._vaults.get(vault.id);
            if (!existing || new Date(vault.updated) > new Date(existing.updated)) {
                this._vaults.set(vault.id, vault);
            }
        }
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
                await Promise.all(this.invites.map(invite => invite.accessSecret(this._invitesKey)));
                return this;
            }
        };
    }

    private async _setMember(account: AccountInfo, status: MemberStatus, permissions: Permissions) {
        if (this.members.length && (!this._account || !this.isAdmin(this._account))) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const signedPublicKey = await getProvider().sign(this._privateKey, account.publicKey, this._signingParams);

        const member = Object.assign({}, account, {
            permissions,
            status,
            signedPublicKey,
            updated: new Date().toISOString()
        });

        this._members.set(member.id, member);
    }

    private async _setSubVault(vault: VaultInfo) {
        if (!this._account || !this.isAdmin(this._account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const signedPublicKey = await getProvider().sign(this._privateKey, vault.publicKey, this._signingParams);

        this._vaults.set(
            vault.id,
            Object.assign(vault, {
                signedPublicKey,
                updated: new Date().toISOString()
            })
        );
    }
}
