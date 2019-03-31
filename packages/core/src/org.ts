import {
    bytesToBase64,
    base64ToBytes,
    bytesToString,
    stringToBytes,
    Serializable,
    unmarshal,
    marshal,
    concatBytes
} from "./encoding";
import { getProvider, RSAPrivateKey, RSAPublicKey, RSAKeyParams, AESKeyParams, RSASigningParams } from "./crypto";
import { SharedContainer } from "./container";
import { Err, ErrorCode } from "./error";
import { Storable } from "./storage";
import { Vault, VaultID } from "./vault";
import { Account, AccountID } from "./account";
import { Invite, InviteID } from "./invite";

export enum OrgRole {
    Owner,
    Admin,
    Member,
    Suspended
}

export class OrgMember extends Serializable {
    id: AccountID = "";
    name = "";
    email = "";
    publicKey!: RSAPublicKey;
    signature!: Uint8Array;
    vaults: {
        id: VaultID;
        readonly: boolean;
    }[] = [];
    role: OrgRole = OrgRole.Member;

    constructor({ id, name, email, publicKey, signature, role }: Partial<OrgMember> = {}) {
        super();
        Object.assign(this, { id, name, email, publicKey, signature });
        this.role = typeof role !== "undefined" && role in OrgRole ? role : OrgRole.Member;
    }

    toRaw(): any {
        return {
            ...super.toRaw(),
            publicKey: bytesToBase64(this.publicKey),
            signature: bytesToBase64(this.signature)
        };
    }

    validate() {
        return (
            typeof this.id === "string" &&
            typeof this.name === "string" &&
            typeof this.email === "string" &&
            this.role in OrgRole &&
            this.publicKey instanceof Uint8Array &&
            this.signature instanceof Uint8Array &&
            this.vaults.every(({ id, readonly }: any) => typeof id === "string" && typeof readonly === "boolean")
        );
    }

    fromRaw({ id, name, email, publicKey, signature, role, vaults }: any) {
        return super.fromRaw({
            id,
            name,
            email,
            publicKey: base64ToBytes(publicKey),
            signature: base64ToBytes(signature),
            role,
            vaults
        });
    }
}

export class Group extends Serializable {
    name = "";
    members: { id: AccountID }[] = [];
    vaults: {
        id: VaultID;
        readonly: boolean;
    }[] = [];

    validate() {
        return (
            typeof this.name === "string" &&
            this.members.every(({ id }: any) => typeof id === "string") &&
            this.vaults.every(({ id, readonly }: any) => typeof id === "string" && typeof readonly === "boolean")
        );
    }

    fromRaw({ name, members, vaults }: any) {
        return super.fromRaw({
            name,
            members,
            vaults
        });
    }
}

export type OrgID = string;

export class Org extends SharedContainer implements Storable {
    id: OrgID = "";
    name: string = "";
    publicKey!: RSAPublicKey;
    privateKey!: RSAPrivateKey;
    invitesKey!: Uint8Array;
    signingParams = new RSASigningParams();
    members: OrgMember[] = [];
    groups: Group[] = [];
    vaults: { id: VaultID; name: string }[] = [];
    invites: Invite[] = [];
    revision: string = "";

    toRaw() {
        return {
            ...super.toRaw(["privateKey", "invitesKey"]),
            publicKey: bytesToBase64(this.publicKey)
        };
    }

    validate() {
        return (
            super.validate() &&
            (typeof this.name === "string" &&
                typeof this.revision === "string" &&
                typeof this.id === "string" &&
                this.publicKey instanceof Uint8Array &&
                this.vaults.every(({ id, name }: any) => typeof id === "string" && typeof name === "string"))
        );
    }

    fromRaw({ id, name, owner, revision, publicKey, members, groups, vaults, invites, signingParams, ...rest }: any) {
        this.signingParams.fromRaw(signingParams);

        Object.assign(this, {
            id,
            name,
            owner,
            revision,
            publicKey: base64ToBytes(publicKey),
            members: members.map((m: any) => new OrgMember().fromRaw(m)),
            groups: groups.map((g: any) => new Group().fromRaw(g)),
            invites: invites.map((g: any) => new Invite().fromRaw(g)),
            vaults
        });

        return super.fromRaw(rest);
    }

    isOwner(m: { id: AccountID }) {
        const member = this.getMember(m);
        return member && member.role <= OrgRole.Owner;
    }

    isAdmin(m: { id: AccountID }) {
        const member = this.getMember(m);
        return member && member.role <= OrgRole.Admin;
    }

    getMember({ id }: { id: AccountID }) {
        return this.members.find(m => m.id === id);
    }

    isMember(acc: { id: AccountID }) {
        return !!this.getMember(acc);
    }

    getGroup(name: string) {
        return [...this.groups].find(g => g.name === name);
    }

    getMembersForGroup(group: Group): OrgMember[] {
        return group.members
            .map(m => this.getMember(m))
            // Filter out undefined members
            .filter(m => !!m) as OrgMember[];
    }

    getGroupsForMember({ id }: { id: AccountID }) {
        return this.groups.filter(g => g.members.some(m => m.id === id));
    }

    getGroupsForVault({ id }: Vault): Group[] {
        return this.groups.filter(group => group.vaults.some(v => v.id === id));
    }

    getMembersForVault({ id }: Vault): OrgMember[] {
        return this.members.filter(member => member.role !== OrgRole.Suspended && member.vaults.some(v => v.id === id));
    }

    getVaultsForMember(acc: OrgMember | Account) {
        const member = this.getMember(acc);

        if (!member) {
            throw "A member with this id does not exist!";
        }

        const results = new Set<VaultID>(member.vaults.map(v => v.id));

        for (const group of this.getGroupsForMember(member)) {
            for (const vault of group.vaults) {
                results.add(vault.id);
            }
        }

        return [...results];
    }

    canRead(vault: { id: VaultID }, acc: { id: AccountID }) {
        const member = this.getMember(acc);

        return (
            member &&
            [member, ...this.getGroupsForMember(member)].some(({ vaults }) => vaults.some(v => v.id === vault.id))
        );
    }

    canWrite(vault: { id: VaultID }, acc: { id: AccountID }) {
        const member = this.getMember(acc);

        return (
            member &&
            member.role !== OrgRole.Suspended &&
            [member, ...this.getGroupsForMember(member)].some(({ vaults }) =>
                vaults.some(v => v.id === vault.id && !v.readonly)
            )
        );
    }

    getInvite(id: InviteID) {
        return this.invites.find(inv => inv.id === id);
    }

    removeInvite({ id }: Invite) {
        this.invites = this.invites.filter(inv => inv.id !== id);
    }

    async initialize({ id, name, email, publicKey }: Account) {
        // Update access to keypair
        await this.updateAccessors([{ id, publicKey }]);

        // Generate key pair used for signing members
        await this.generateKeys();

        const member = await this.sign(new OrgMember({ id, name, email, publicKey, role: OrgRole.Owner }));
        this.members.push(member);
    }

    async generateKeys() {
        this.invitesKey = await getProvider().generateKey(new AESKeyParams());
        const { privateKey, publicKey } = await getProvider().generateKey(new RSAKeyParams());
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        await this.setData(
            stringToBytes(
                marshal({ privateKey: bytesToBase64(privateKey), invitesKey: bytesToBase64(this.invitesKey) })
            )
        );
    }

    async rotateKeys(force = false) {
        if (!force) {
            // Verify members and groups with current public key
            await this.verifyAll();
        }

        // Rotate Org key pair
        await this.generateKeys();

        // Rotate org encryption key
        delete this.encryptedData;
        await this.updateAccessors(this.members.filter(m => m.role === OrgRole.Owner));

        // Resign groups and members
        await Promise.all(this.members.map(each => this.sign(each)));
    }

    async unlock(account: Account) {
        await super.unlock(account);
        if (this.encryptedData) {
            const { privateKey, invitesKey } = unmarshal(bytesToString(await this.getData()));
            this.privateKey = base64ToBytes(privateKey);
            this.invitesKey = base64ToBytes(invitesKey);
        }
    }

    async sign(member: OrgMember): Promise<OrgMember> {
        if (!this.privateKey) {
            throw "Organisation needs to be unlocked first.";
        }

        member.signature = await getProvider().sign(
            this.privateKey,
            concatBytes(stringToBytes(member.id), stringToBytes(member.email), member.publicKey),
            this.signingParams
        );
        return member;
    }

    async verify(member: OrgMember): Promise<void> {
        if (!member.signature) {
            throw new Err(ErrorCode.PUBLIC_KEY_MISMATCH, "No signed public key provided!");
        }

        const verified = await getProvider().verify(
            this.publicKey,
            member.signature,
            concatBytes(stringToBytes(member.id), stringToBytes(member.email), member.publicKey),
            this.signingParams
        );

        if (!verified) {
            throw new Err(ErrorCode.PUBLIC_KEY_MISMATCH, `Failed to verify public key of ${member.name}!`);
        }
    }

    async verifyAll(subjects: OrgMember[] = this.members.filter(m => m.role !== OrgRole.Suspended)) {
        // Verify public keys for members and groups
        await Promise.all(subjects.map(async obj => this.verify(obj)));
    }

    async addOrUpdateMember({
        id,
        name,
        email,
        publicKey,
        role
    }: {
        id: string;
        name: string;
        email: string;
        publicKey: Uint8Array;
        role?: OrgRole;
    }) {
        if (!this.privateKey) {
            throw "Organisation needs to be unlocked first.";
        }

        role = typeof role !== "undefined" ? role : OrgRole.Member;

        const existing = this.members.find(m => m.id === id);

        if (existing) {
            Object.assign(existing, { name, email, publicKey, role });
            await this.sign(existing);
        } else {
            this.members.push(await this.sign(new OrgMember({ id, name, email, publicKey, role })));
        }
    }
}
