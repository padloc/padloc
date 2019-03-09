import { bytesToString, stringToBytes, base64ToBytes, bytesToBase64, marshal, unmarshal } from "./encoding";
import { getProvider, RSAPublicKey, RSAPrivateKey, RSAKeyParams } from "./crypto";
import { PBES2Container } from "./container";
import { Storable } from "./storage";
import { SessionInfo } from "./session";
import { VaultID } from "./vault";
import { OrgID } from "./org";

export type AccountID = string;

export interface AccountInfo {
    id: AccountID;
    email: string;
    name: string;
    publicKey: RSAPublicKey;
}

export interface SignedAccountInfo extends AccountInfo {
    signedPublicKey: Uint8Array;
}

export class Account extends PBES2Container implements Storable, AccountInfo {
    id: AccountID = "";
    email = "";
    name = "";
    created = new Date();
    updated = new Date();
    publicKey!: RSAPublicKey;
    privateKey!: RSAPrivateKey;
    mainVault: VaultID = "";
    sessions: SessionInfo[] = [];
    orgs: OrgID[] = [];

    get info(): AccountInfo {
        return { id: this.id, email: this.email, publicKey: this.publicKey, name: this.name };
    }

    get locked(): boolean {
        return !this.privateKey;
    }

    async initialize(password: string) {
        const { publicKey, privateKey } = await getProvider().generateKey(new RSAKeyParams());
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        await this.setPassword(password);
    }

    async setPassword(password: string) {
        await super.unlock(password);
        await this.setData(stringToBytes(marshal({ privateKey: bytesToBase64(this.privateKey) })));
        this.updated = new Date();
    }

    async unlock(password: string) {
        await super.unlock(password);
        const { privateKey } = unmarshal(bytesToString(await this.getData()));
        this.privateKey = base64ToBytes(privateKey);
    }

    lock() {
        delete this.privateKey;
    }

    toRaw(): any {
        return {
            ...super.toRaw(["privateKey"]),
            publicKey: bytesToBase64(this.publicKey)
        };
    }

    validate() {
        return (
            typeof this.id === "string" &&
            typeof this.email === "string" &&
            typeof this.name === "string" &&
            typeof this.mainVault === "string" &&
            this.created instanceof Date &&
            this.updated instanceof Date &&
            this.publicKey instanceof Uint8Array &&
            this.orgs.every(org => typeof org === "string")
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
            orgs: orgs
        });
        return super.fromRaw(rest);
    }

    toString() {
        return this.name || this.email;
    }
}
