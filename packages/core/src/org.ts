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
        return [...this.groups, this.admins, this.everyone].find(g => g.id === id);
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
        return [this.everyone, ...this.groups].filter(group => group.vaults.some(v => v.id === id));
    }

    getInvite(id: InviteID) {
        return this.invites.find(inv => inv.id === id);
    }

    removeInvite({ id }: Invite) {
        this.invites = this.invites.filter(inv => inv.id !== id);
    }

    async initialize(account: Account) {
        this.admins.id = uuid();
        this.admins.name = "Admins";
        this.everyone.id = uuid();
        this.everyone.name = "Everyone";

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

            // Access all groups via admin group
            await Promise.all(this.groups.map(group => group.access(this.admins)));

            // Verify public keys for members and groups
            await Promise.all(
                [...this.members, ...this.groups].map(async (obj: OrgMember) => {
                    if (!(await this.verify(obj))) {
                        throw new Err(
                            ErrorCode.PUBLIC_KEY_MISMATCH,
                            `Failed to verify public key for member org group: ${obj.name}.`
                        );
                    }
                })
            );
        }

        await Promise.all(this.getGroupsForMember(account).map(g => g.access(account)));
    }

    async sign<T extends { publicKey: Uint8Array; signedPublicKey?: Uint8Array }>(obj: T): Promise<T> {
        obj.signedPublicKey = await getProvider().sign(this.privateKey, obj.publicKey, this.signingParams);
        return obj;
    }

    async verify(obj: OrgMember | Group): Promise<boolean> {
        let verified = false;
        if (!obj.signedPublicKey) {
            return false;
        }
        try {
            verified = await getProvider().verify(
                this.publicKey,
                obj.signedPublicKey,
                obj.publicKey,
                this.signingParams
            );
        } catch (e) {}
        return verified;
    }

    async addMember({
        id,
        name,
        email,
        publicKey
    }: {
        id: string;
        name: string;
        email: string;
        publicKey: Uint8Array;
    }) {
        if (!this.privateKey) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const member = await this.sign(new OrgMember({ id, name, email, publicKey }));
        this.members.push(member);
        await this.updateGroupMembers(this.everyone, this.members);
    }

    async createGroup(name: string, members: OrgMember[] = []) {
        const group = new Group();
        group.id = uuid();
        group.name = name;
        await this.updateGroupMembers(group, members);
        await group.generateKeys();
        this.groups.push(await this.sign(group));
        return group;
    }

    async updateGroupMembers(group: Group, members: OrgMember[]) {
        // Admin group has access to all other groups
        await group.updateAccessors([this.admins, ...members]);
    }

    async updateVault(vault: Vault) {
        await vault.updateAccessors([this.admins, ...this.getGroupsForVault(vault)]);
    }
}
