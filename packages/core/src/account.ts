import { Base64String, base64ToString, stringToBase64, marshal, unmarshal } from "./encoding";
import { getProvider, RSAPublicKey, RSAPrivateKey, defaultRSAKeyParams } from "./crypto";
import { PBES2Container } from "./container";
import { Storable } from "./storage";
import { VaultInfo } from "./vault";
import { Collection, CollectionItem, CollectionChanges } from "./collection";
import { SessionInfo } from "./session";

export type AccountID = string;

export interface AccountInfo {
    id: AccountID;
    email: string;
    name: string;
    publicKey: RSAPublicKey;
}

export interface SignedAccountInfo extends AccountInfo {
    signedPublicKey: Base64String;
}

export class Account extends PBES2Container implements Storable, AccountInfo {
    kind = "account";
    email = "";
    name = "";
    created = new Date();
    updated = new Date();
    publicKey: RSAPublicKey = "";
    privateKey: RSAPrivateKey = "";
    mainVault = "";
    sessions = new Collection<SessionInfo>();
    vaults = new Collection<VaultInfo & CollectionItem>();

    get pk() {
        return this.id;
    }

    get info(): AccountInfo {
        return { id: this.id, email: this.email, publicKey: this.publicKey, name: this.name };
    }

    get locked(): boolean {
        return !this.privateKey;
    }

    constructor(public id: AccountID = "") {
        super();
    }

    async initialize(password: string) {
        await this._generateKeyPair();
        await this.setPassword(password);
    }

    async setPassword(password: string) {
        this.password = password;
        await this.set(stringToBase64(marshal({ privateKey: this.privateKey })));
        this.updated = new Date();
    }

    setName(name: string) {
        this.name = name;
        this.updated = new Date();
    }

    async unlock(password: string) {
        this.password = password;
        const { privateKey } = unmarshal(base64ToString(await this.get()));
        this.privateKey = privateKey;
    }

    lock() {
        this.password = "";
        this.privateKey = "";
    }

    merge(
        account: Account
    ): {
        name: boolean;
        publicKey: boolean;
        vaults: CollectionChanges<VaultInfo & CollectionItem>;
        sessions: CollectionChanges<SessionInfo>;
    } {
        let nameChanged = false;
        let publicKeyChanged = false;

        if (account.updated > this.updated) {
            nameChanged = this.name !== account.name;
            this.name = account.name;

            publicKeyChanged = this.publicKey !== account.publicKey;
            this.publicKey = account.publicKey;

            // These effectively updates the password
            this.keyParams = account.keyParams;
            this.encryptionParams = account.encryptionParams;
            this.encryptedData = account.encryptedData;

            this.updated = account.updated;
        }

        return {
            vaults: this.vaults.merge(account.vaults),
            sessions: this.sessions.merge(account.sessions),
            name: nameChanged,
            publicKey: publicKeyChanged
        };
    }

    async serialize() {
        return {
            ...(await super.serialize()),
            id: this.id,
            created: this.created,
            updated: this.updated,
            email: this.email,
            name: this.name,
            mainVault: this.mainVault,
            publicKey: this.publicKey,
            vaults: await this.vaults.serialize(),
            sessions: await this.sessions.serialize()
        };
    }

    async deserialize(raw: any) {
        await super.deserialize(raw);
        this.id = raw.id;
        this.created = new Date(raw.created);
        this.updated = new Date(raw.updated);
        this.email = raw.email;
        this.name = raw.name;
        this.mainVault = raw.mainVault;
        this.publicKey = raw.publicKey;
        this.vaults = await new Collection<VaultInfo & CollectionItem>().deserialize(raw.vaults);
        this.sessions = await new Collection<SessionInfo>().deserialize(raw.sessions);
        return this;
    }

    private async _generateKeyPair() {
        const { publicKey, privateKey } = await getProvider().generateKey(defaultRSAKeyParams());
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.updated = new Date();
    }

    toString() {
        return this.name || this.email;
    }
}
