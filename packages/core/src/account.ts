import {
    bytesToString,
    stringToBytes,
    base64ToBytes,
    bytesToBase64,
    concatBytes,
    marshal,
    unmarshal
} from "./encoding";
import { getProvider, RSAPublicKey, RSAPrivateKey, RSAKeyParams, HMACKey, HMACParams, HMACKeyParams } from "./crypto";
import { Err, ErrorCode } from "./error";
import { PBES2Container } from "./container";
import { Storable } from "./storage";
import { SessionInfo } from "./session";
import { VaultID } from "./vault";
import { Org, OrgID } from "./org";

export type AccountID = string;

export class Account extends PBES2Container implements Storable {
    id: AccountID = "";
    email = "";
    name = "";
    created = new Date();
    updated = new Date();
    publicKey!: RSAPublicKey;
    privateKey!: RSAPrivateKey;
    signingKey!: HMACKey;
    mainVault: VaultID = "";
    sessions: SessionInfo[] = [];
    orgs: OrgID[] = [];
    revision: string = "";

    get locked(): boolean {
        return !this.privateKey;
    }

    async initialize(password: string) {
        const { publicKey, privateKey } = await getProvider().generateKey(new RSAKeyParams());
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.signingKey = await getProvider().generateKey(new HMACKeyParams());
        await this.setPassword(password);
    }

    async setPassword(password: string) {
        await super.unlock(password);
        await this.setData(
            stringToBytes(
                marshal({ privateKey: bytesToBase64(this.privateKey), signingKey: bytesToBase64(this.signingKey) })
            )
        );
        this.updated = new Date();
    }

    async unlock(password: string) {
        await super.unlock(password);
        const { privateKey, signingKey } = unmarshal(bytesToString(await this.getData()));
        this.privateKey = base64ToBytes(privateKey);
        this.signingKey = base64ToBytes(signingKey);
    }

    lock() {
        super.lock();
        delete this.privateKey;
        delete this.signingKey;
    }

    validate() {
        return (
            super.validate() &&
            (typeof this.id === "string" &&
                typeof this.email === "string" &&
                typeof this.name === "string" &&
                typeof this.mainVault === "string" &&
                typeof this.revision === "string" &&
                this.created instanceof Date &&
                this.updated instanceof Date &&
                this.publicKey instanceof Uint8Array &&
                this.orgs.every(id => typeof id === "string"))
        );
    }

    toRaw(): any {
        return {
            ...super.toRaw(["privateKey", "signingKey"]),
            publicKey: bytesToBase64(this.publicKey)
        };
    }

    fromRaw({ id, created, updated, email, name, mainVault, publicKey, orgs, revision, ...rest }: any) {
        Object.assign(this, {
            id,
            email,
            name,
            mainVault,
            revision,
            created: new Date(created),
            updated: new Date(updated),
            publicKey: base64ToBytes(publicKey),
            orgs
        });
        return super.fromRaw(rest);
    }

    clone() {
        const clone = super.clone();
        clone.privateKey = this.privateKey;
        clone.signingKey = this.signingKey;
        return clone;
    }

    toString() {
        return this.name || this.email;
    }

    async signOrg({ id, publicKey }: { id: string; publicKey: Uint8Array }) {
        return getProvider().sign(this.signingKey, concatBytes(stringToBytes(id), publicKey), new HMACParams());
    }

    async verifyOrg(org: Org): Promise<void> {
        if (!this.signingKey) {
            throw "Account needs to be unlocked first";
        }

        const member = org.getMember(this);

        if (!member) {
            throw new Err(ErrorCode.VERIFICATION_ERROR, "Account is not a member.");
        }

        const verified = await getProvider().verify(
            this.signingKey,
            member.orgSignature,
            concatBytes(stringToBytes(org.id), org.publicKey),
            new HMACParams()
        );

        if (!verified) {
            throw new Err(ErrorCode.VERIFICATION_ERROR, `Failed to verify public key of ${org.name}!`);
        }
    }
}
