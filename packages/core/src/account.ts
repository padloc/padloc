import { Base64String } from "./encoding";
import { PBES2Container, getProvider, RSAPublicKey, RSAPrivateKey, defaultRSAKeyParams } from "./crypto";
import { Storable } from "./storage";
import { VaultInfo } from "./vault";
import { Collection, CollectionItem } from "./collection";
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

    private get _encSerializer() {
        return {
            serialize: async () => {
                return { privateKey: this.privateKey };
            },
            deserialize: async ({ privateKey }: { privateKey: string }) => {
                this.privateKey = privateKey;
                return this;
            }
        };
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
        await this.set(this._encSerializer);
    }

    async unlock(password: string) {
        this.password = password;
        await this.get(this._encSerializer);
    }

    lock() {
        this.password = "";
        this.privateKey = "";
    }

    merge(account: Account) {
        if (account.updated > this.updated) {
            this.name = account.name;
            this.mainVault = account.mainVault;
            this.keyParams = account.keyParams;
            this.encryptionParams = account.encryptionParams;
            this.encryptedData = account.encryptedData;
            this.updated = account.updated;
            this.created = account.created;
            this.publicKey = account.publicKey;
        }

        return {
            vaults: this.vaults.merge(account.vaults),
            sessions: this.sessions.merge(account.sessions)
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
    }

    toString() {
        return this.name || this.email;
    }
}
