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

export type MemberStatus = "active" | "removed";

export interface Permissions {
    read: boolean;
    write: boolean;
    manage: boolean;
}

export interface GroupMember extends SignedAccountInfo {
    permissions: Permissions;
    status: MemberStatus;
    updated: DateString;
}

export type GroupKind = "store" | "org";

export interface GroupInfo {
    id: string;
    kind: GroupKind;
    name: string;
    publicKey: RSAPublicKey;
}

export interface SignedGroupInfo extends GroupInfo {
    signedPublicKey: Base64String;
}

export interface SubGroup extends SignedGroupInfo {
    updated: DateString;
}

export abstract class Group implements GroupInfo {
    abstract kind: GroupKind;
    owner: AccountID = "";
    publicKey: RSAPublicKey = "";
    created: DateString = new Date().toISOString();
    parent: GroupInfo | null = null;

    get info(): GroupInfo {
        return {
            id: this.id,
            kind: this.kind,
            name: this.name,
            publicKey: this.publicKey
        };
    }

    get members() {
        return Array.from(this._members.values());
    }

    get groups() {
        return Array.from(this._groups.values());
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
    private _members: Map<string, GroupMember> = new Map<string, GroupMember>();
    private _groups: Map<string, SubGroup> = new Map<string, SubGroup>();
    private _invites = new Map<string, Invite>();
    private _invitesKey: AESKey = "";
    private _signingParams: RSASigningParams = defaultRSASigningParams();

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

    async verify(subj: GroupMember | SubGroup): Promise<boolean> {
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

    async verifySubGroup(info: GroupInfo): Promise<boolean> {
        const subGroup = this._groups.get(info.id);
        return !!subGroup && subGroup.publicKey === info.publicKey && (await this.verify(subGroup));
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

    async addGroup(group: GroupInfo) {
        if (this._groups.has(group.id)) {
            throw "Already a subgroup";
        }
        return this._setGroup(group);
    }

    async updateGroup(group: GroupInfo) {
        if (this._groups.has(group.id)) {
            throw "Not a subgroup";
        }
        return this._setGroup(group);
    }

    async removeGroup(group: GroupInfo) {
        if (this._groups.has(group.id)) {
            throw "Not a subgroup";
        }
        this._groups.delete(group.id);
    }

    update(group: this) {
        const { manage } = this.getPermissions();

        if (manage) {
            this.name = group.name;
            this.publicKey = group.publicKey;
            this.parent = group.parent;
            this._adminContainer = group._adminContainer;
            this._mergeMembers(group.members);
            this._mergeGroups(group.groups);
        }
    }

    async serialize(): Promise<any> {
        if (this._account && this.isAdmin(this._account) && this._account.privateKey) {
            // TODO: Do something about removed admins
            await this._adminContainer.setAccessors(
                this.members.filter(m => m.status === "active" && m.permissions.manage).map(({ id, publicKey }) => {
                    return { id, publicKey, encryptedKey: "" };
                })
            );
            await this._adminContainer.set(this._adminSerializer);
        }

        return Object.assign(this.info, {
            created: this.created,
            owner: this.owner,
            parent: this.parent,
            members: this.members,
            groups: this.groups,
            invites: await Promise.all(this.invites.map(i => i.serialize())),
            signingParams: this._signingParams,
            adminData: await this._adminContainer.serialize()
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
        for (const subj of raw.members.concat(raw.groups)) {
            if (!(await this.verify(subj))) {
                throw new Err(ErrorCode.PUBLIC_KEY_MISMATCH);
            }
        }
        this._mergeMembers(raw.members);
        this._mergeGroups(raw.groups);
        this._signingParams = raw.signingParams;
        this._invites.clear();
        await Promise.all(
            raw.invites.map(async (invite: any) => {
                this._invites.set(invite.email, await new Invite().deserialize(invite));
            })
        );
        await this._adminContainer.deserialize(raw.adminData);
        if (this._account && this.isAdmin(this._account) && this._account.privateKey) {
            await this._adminContainer.get(this._adminSerializer);
        }
        return this;
    }

    protected _mergeMembers(members: GroupMember[]) {
        for (const member of members) {
            const existing = this.getMember(member);
            if (!existing || new Date(member.updated) > new Date(existing.updated)) {
                this._members.set(member.id, member);
            }
        }
    }

    protected _mergeGroups(groups: SubGroup[]) {
        for (const group of groups) {
            const existing = this._groups.get(group.id);
            if (!existing || new Date(group.updated) > new Date(existing.updated)) {
                this._groups.set(group.id, group);
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

    private async _setGroup(group: GroupInfo) {
        if (!this._account || !this.isAdmin(this._account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const signedPublicKey = await getProvider().sign(this._privateKey, group.publicKey, this._signingParams);

        this._groups.set(
            group.id,
            Object.assign(group, {
                signedPublicKey,
                updated: new Date().toISOString()
            })
        );
    }
}
