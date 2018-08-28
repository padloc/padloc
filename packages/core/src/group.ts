import { Base64String, DateString, Serializable } from "./encoding";
import { SharedContainer, KeyExchange, RSAPublicKey, RSAPrivateKey, RSASigningParams, getProvider } from "./crypto";
import { Account, AccountInfo, AccountID } from "./auth";
import { Err, ErrorCode } from "./error";
import { uuid } from "./util";

export type MemberStatus = "active" | "removed";

export interface Permissions {
    read: boolean;
    write: boolean;
    manage: boolean;
}

export interface GroupMember extends AccountInfo {
    signedPublicKey: Base64String;
    permissions: Permissions;
    status: MemberStatus;
    updated: DateString;
}

export class Group {
    owner: AccountID = "";
    privateKey: RSAPrivateKey = "";
    publicKey: RSAPublicKey = "";
    created: DateString = new Date().toISOString();

    get members() {
        return Array.from(this._members.values());
    }

    get invites() {
        return Array.from(this._invites.values());
    }

    protected _account: Account | null = null;

    private _members: Map<string, GroupMember> = new Map<string, GroupMember>();
    private _adminContainer: SharedContainer = new SharedContainer();
    private _invites = new Map<string, Invite>();
    private _signingParams: RSASigningParams = {
        algorithm: "RSA-PSS",
        hash: "SHA-1",
        saltLength: 128
    };

    constructor(public id: string, public name = "") {
        this._adminContainer = new SharedContainer();
    }

    async initialize(account: Account) {
        this.access(account);
        await this._generateKeyPair();
        await this.setMember(this._account!, "active", { read: true, write: true, manage: true });
    }

    access(account: Account) {
        this._account = account;
        this._adminContainer.access(account);
    }

    isOwner(account: AccountInfo) {
        return this.owner === account.id;
    }

    isAdmin(account: AccountInfo) {
        const member = this.getMember(account);
        return member && member.permissions.manage;
    }

    isMember(account: AccountInfo) {
        return !!this.getMember(account);
    }

    isInvited(account: AccountInfo) {
        return !!this.invites.find(({ email }) => email === account.email);
    }

    getMember(account: AccountInfo) {
        return this._members.get(account.id);
    }

    async setMember(account: AccountInfo, status: MemberStatus, permissions: Permissions) {
        if (this.members.length && (!this._account || !this.isAdmin(this._account))) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const signedPublicKey = await getProvider().sign(this.privateKey, account.publicKey, this._signingParams);

        const member = Object.assign(
            {
                permissions,
                status,
                signedPublicKey,
                updated: new Date().toISOString()
            },
            account
        );

        this._members.set(member.id, member);
    }

    async verifyMember(member: GroupMember) {
        let verified = false;
        try {
            verified = await getProvider().verify(
                this.publicKey,
                member.signedPublicKey,
                member.publicKey,
                this._signingParams
            );
        } catch (e) {}
        return verified;
    }

    getInvite(id: string) {
        return this._invites.get(id);
    }

    async createInvite(email: string) {
        if (!this._account || !this.isAdmin(this._account)) {
            return new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const invite = new Invite();
        invite.id = uuid();
        invite.email = email;
        await invite.initialize(this);
        this._invites.set(invite.id, invite);
    }

    async serialize(): Promise<any> {
        if (this._account && this.isAdmin(this._account)) {
            // TODO: Do something about removed admins
            await this._adminContainer.setAccessors(
                this.members.filter(m => m.status === "active" && m.permissions.manage).map(({ id, publicKey }) => {
                    return { id, publicKey, encryptedKey: "" };
                })
            );
            await this._adminContainer.set(this._adminSerializer);
        }
        return {
            id: this.id,
            created: this.created,
            owner: this.owner,
            name: this.name,
            publicKey: this.publicKey,
            members: this.members,
            invites: await Promise.all(this.invites.map(i => i.serialize())),
            signingParams: this._signingParams,
            adminData: await this._adminContainer.serialize()
        };
    }

    async deserialize(raw: any) {
        this.id = raw.id;
        this.created = raw.created;
        this.owner = raw.owner;
        this.name = raw.name;
        this.publicKey = raw.publicKey;
        this._mergeMembers(raw.members);
        this._signingParams = raw.signingParams;
        await Promise.all(
            raw.invites.map(async (i: any) => {
                this._invites.set(i.id, await new Invite().deserialize(i));
            })
        );
        await this._adminContainer.deserialize(raw.adminData);
        if (this._account && this.isAdmin(this._account)) {
            await this._adminContainer.get(this._adminSerializer);
        }
        return this;
    }

    private _mergeMembers(members: GroupMember[]) {
        for (const member of members) {
            const existing = this.getMember(member);
            if (!existing || new Date(member.updated) > new Date(existing.updated)) {
                this._members.set(member.id, member);
            }
        }
    }

    private async _generateKeyPair() {
        const { publicKey, privateKey } = await getProvider().generateKey({
            algorithm: "RSA",
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: "SHA-1"
        });
        this.publicKey = publicKey;
        this.privateKey = privateKey;
    }

    private get _adminSerializer(): Serializable {
        return {
            serialize: async () => {
                return {
                    publicKey: this.publicKey,
                    privateKey: this.privateKey,
                    pendingKeyExchanges: this.invites.map(({ id, keyExchange: { expires, secret } }) => {
                        return { id, expires, secret };
                    })
                };
            },
            deserialize: async (raw: any) => {
                this.privateKey = raw.privateKey;
                if (raw.publicKey !== this.publicKey) {
                    throw new Err(ErrorCode.PUBLIC_KEY_MISMATCH);
                }
                for (const {
                    id,
                    keyExchange: { expires, secret }
                } of raw.pendingKeyExchanges) {
                    const invite = this._invites.get(id);
                    invite && Object.assign(invite.keyExchange, { expires, secret });
                }
                return this;
            }
        };
    }
}

export type InviteStatus = "none" | "initialized" | "sent" | "accepted" | "canceled" | "rejected" | "failed";

export class Invite {
    id: string = "";
    email: string = "";
    status: InviteStatus = "none";
    invitee?: AccountInfo;
    invitor?: AccountInfo;
    keyExchange = new KeyExchange();

    async initialize(group: Group) {
        await this.keyExchange.initiate(group.publicKey);
        this.status = "initialized";
    }

    async accept(invitee: AccountInfo, secret: string): Promise<boolean> {
        this.invitee = invitee;
        return await this.keyExchange.complete(invitee.publicKey, secret);
        this.status = "accepted";
    }

    async serialize() {
        return {
            id: this.id,
            status: this.status,
            email: this.email,
            invite: this.invitee,
            invitor: this.invitor,
            keyExchange: await this.keyExchange.serialize()
        };
    }

    async deserialize(raw: any) {
        this.id = raw.id;
        this.status = raw.status;
        this.email = raw.email;
        this.invitee = raw.invitee;
        this.invitor = raw.invitor;
        await this.keyExchange.deserialize(raw.keyExchange);
        return this;
    }
}
