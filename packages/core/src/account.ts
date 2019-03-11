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
    orgs: { id: OrgID; signature: Uint8Array }[] = [];

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
        delete this.privateKey;
    }

    toRaw(): any {
        return {
            ...super.toRaw(["privateKey", "signingKey"]),
            publicKey: bytesToBase64(this.publicKey),
            orgs: this.orgs.map(({ signature, ...rest }) => ({
                signature: bytesToBase64(signature),
                ...rest
            }))
        };
    }

    validate() {
        return (
            super.validate() &&
            (typeof this.id === "string" &&
                typeof this.email === "string" &&
                typeof this.name === "string" &&
                typeof this.mainVault === "string" &&
                this.created instanceof Date &&
                this.updated instanceof Date &&
                this.publicKey instanceof Uint8Array &&
                this.orgs.every(org => org && typeof org.id === "string" && org.signature instanceof Uint8Array))
        );
    }

    fromRaw({ id, created, updated, email, name, mainVault, sharedVaults, publicKey, orgs, ...rest }: any) {
        Object.assign(this, {
            id,
            email,
            name,
            mainVault,
            sharedVaults,
            created: new Date(created),
            updated: new Date(updated),
            publicKey: base64ToBytes(publicKey),
            orgs: orgs.map(({ signature, ...rest }: any) => ({
                signature: base64ToBytes(signature),
                ...rest
            }))
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

    async addOrg({ id, publicKey }: { id: string; publicKey: Uint8Array }) {
        const signature = await getProvider().sign(
            this.signingKey,
            concatBytes(stringToBytes(id), publicKey),
            new HMACParams()
        );

        const existing = this.orgs.find(org => org.id === id);

        if (existing) {
            Object.assign(existing, { id, signature });
        } else {
            this.orgs.push({ id, signature });
        }
    }

    async verifyOrg({ id, publicKey, name }: Org): Promise<void> {
        const signed = this.orgs.find(org => org.id === id);

        const verified =
            signed &&
            (await getProvider().verify(
                this.signingKey,
                signed.signature,
                concatBytes(stringToBytes(id), publicKey),
                new HMACParams()
            ));

        if (!verified) {
            throw new Err(ErrorCode.PUBLIC_KEY_MISMATCH, `Failed to verify public key of ${name}!`);
        }
    }
}
