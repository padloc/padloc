import {
    bytesToBase64,
    base64ToBytes,
    bytesToString,
    stringToBytes,
    Serializable,
    unmarshal,
    marshal
} from "./encoding";
import { getProvider, RSAPrivateKey, RSAPublicKey, RSAKeyParams, HMACKeyParams, RSASigningParams } from "./crypto";
import { uuid } from "./util";
import { SharedContainer } from "./container";
import { Err, ErrorCode } from "./error";
import { Storable } from "./storage";
import { Vault, VaultID } from "./vault";
import { Group, GroupID } from "./group";
import { Account, AccountID } from "./account";
import { Invite, InviteID } from "./invite";

export class OrgMember extends Serializable {
    id: AccountID = "";
    name = "";
    email = "";
    publicKey!: RSAPublicKey;
    signedPublicKey!: Uint8Array;

    constructor(vals?: Partial<OrgMember>) {
        super();
        if (vals) {
            Object.assign(this, vals);
        }
    }

    toRaw() {
        return {
            ...super.toRaw(["privateKey"]),
            publicKey: bytesToBase64(this.publicKey),
            signedPublicKey: bytesToBase64(this.signedPublicKey)
        };
    }

    validate() {
        return (
            typeof this.id === "string" &&
            typeof this.name === "string" &&
            typeof this.email === "string" &&
            this.publicKey instanceof Uint8Array &&
            this.signedPublicKey instanceof Uint8Array
        );
    }

    fromRaw({ id, name, publicKey, signedPublicKey, ...rest }: any) {
        Object.assign(this, {
            id,
            name,
            publicKey: base64ToBytes(publicKey),
            signedPublicKey: base64ToBytes(signedPublicKey)
        });

        return super.fromRaw(rest);
    }
}

export type OrgID = string;
export type OrgRole = "admin" | "member";

export class Org extends SharedContainer implements Storable {
    id: OrgID = "";
    name: string = "";
    owner: AccountID = "";
    publicKey!: RSAPublicKey;
    privateKey!: RSAPrivateKey;
    invitesKey!: Uint8Array;
    signingParams = new RSASigningParams();
    members: OrgMember[] = [];
    groups: Group[] = [];
    vaults: {
        id: VaultID;
        name: string;
    }[] = [];
    invites: Invite[] = [];
    admins: Group = new Group();
    everyone: Group = new Group();

    toRaw() {
        return {
            ...super.toRaw(),
            publicKey: bytesToBase64(this.publicKey)
        };
    }

    validate() {
        return (
            typeof this.name === "string" &&
            typeof this.id === "string" &&
            typeof this.owner === "string" &&
            this.publicKey instanceof Uint8Array &&
            this.vaults.every(({ id, name }: any) => typeof id === "string" && typeof name === "string")
        );
    }

    fromRaw({
        id,
        name,
        owner,
        publicKey,
        members,
        groups,
        vaults,
        invites,
        admins,
        everyone,
        signingParams,
        ...rest
    }: any) {
        this.signingParams.fromRaw(signingParams);
        this.admins.fromRaw(admins);
        this.everyone.fromRaw(everyone);

        Object.assign(this, {
            id,
            name,
            owner,
            publicKey: base64ToBytes(publicKey),
            members: members.map((m: any) => new OrgMember().fromRaw(m)),
            groups: groups.map((g: any) => new Group().fromRaw(g)),
            invites: invites.map((g: any) => new Invite().fromRaw(g)),
            vaults
        });

        return super.fromRaw(rest);
    }

    isAdmin(m: { id: string }) {
        return !!this.admins.isMember(m);
    }

    getMember({ id }: { id: AccountID }) {
        return this.members.find(m => m.id === id);
    }

    isMember(acc: { id: AccountID }) {
        return !!this.getMember(acc);
    }

    getGroup(id: GroupID) {
        return this.groups.find(g => g.id === id);
    }

    getMembersForGroup(group: Group): OrgMember[] {
        return group.accessors
            .map(a => this.getMember(a))
            // Filter out undefined members
            .filter(m => !!m) as OrgMember[];
    }

    getGroupsForMember({ id }: OrgMember | Account) {
        return [...this.groups.filter(g => g.accessors.some(a => a.id === id)), this.everyone];
    }

    getGroupsForVault({ id }: Vault) {
        return this.groups.filter(group => group.vaults.some(v => v.id === id));
    }

    getInvite(id: InviteID) {
        return this.invites.find(inv => inv.id === id);
    }

    removeInvite({ id }: Invite) {
        this.invites = this.invites.filter(inv => inv.id !== id);
    }

    async initialize(account: Account) {
        this.admins.id = uuid();
        this.everyone.id = uuid();

        // Add account to admin group
        await this.admins.updateAccessors([account]);

        // Generate admin group keys
        await this.admins.generateKeys();

        // Grant admin group access to
        await this.updateAccessors([this.admins]);

        await this.generateKeys();

        await this.addMember(account);

        await this.everyone.generateKeys();

        await this.sign(this.admins);
        await this.sign(this.everyone);
    }

    async generateKeys() {
        this.invitesKey = await getProvider().generateKey(new HMACKeyParams());
        const { privateKey, publicKey } = await getProvider().generateKey(new RSAKeyParams());
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        await this.setData(
            stringToBytes(
                marshal({ privateKey: bytesToBase64(privateKey), invitesKey: bytesToBase64(this.invitesKey) })
            )
        );
    }

    async access(account: Account) {
        if (this.isAdmin(account)) {
            await this.admins.access(account);
            await super.access(this.admins);
            if (this.encryptedData) {
                const { privateKey, invitesKey } = unmarshal(bytesToString(await this.getData()));
                this.privateKey = base64ToBytes(privateKey);
                this.invitesKey = base64ToBytes(invitesKey);
            }
        }

        await Promise.all(this.getGroupsForMember(account).map(g => g.access(account)));
    }

    async addMember(account: { id: string; name: string; email: string; publicKey: Uint8Array }) {
        if (!this.privateKey) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const member = new OrgMember(await this.sign(account));
        this.members.push(member);
        await this.everyone.updateAccessors(this.members);
    }

    async sign(obj: { publicKey: Uint8Array; signedPublicKey?: Uint8Array }) {
        obj.signedPublicKey = await getProvider().sign(this.privateKey, obj.publicKey, this.signingParams);
        return obj;
    }

    async verify(subj: OrgMember | Group): Promise<boolean> {
        let verified = false;
        if (!subj.signedPublicKey) {
            return false;
        }
        try {
            verified = await getProvider().verify(
                this.publicKey,
                subj.signedPublicKey,
                subj.publicKey,
                this.signingParams
            );
        } catch (e) {}
        return verified;
    }
}
