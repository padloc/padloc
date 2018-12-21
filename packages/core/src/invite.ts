import { getProvider, PBKDF2Params, HMACParams, HMACKey, AESKey } from "./crypto";
import { SimpleContainer } from "./container";
import { base64ToHex } from "./encoding";
import { Collection, CollectionItem } from "./collection";
import { VaultInfo, SignedVaultInfo } from "./vault";
import { AccountInfo, SignedAccountInfo } from "./account";
import { uuid } from "./util";

export type InvitePurpose = "join_vault" | "confirm_membership";

export class Invite implements CollectionItem {
    id: string = "";
    created = new Date();
    updated = new Date();
    expires = new Date();

    vault: SignedVaultInfo | null = null;
    invitee: SignedAccountInfo | null = null;
    invitor: AccountInfo | null = null;

    set secret(s: string) {
        this._secret = s;
        this._key = "";
    }

    get secret() {
        return this._secret;
    }

    get expired(): boolean {
        return new Date() > new Date(this.expires);
    }

    get accepted(): boolean {
        return !!this.invitee;
    }

    private _secret: string = "";
    private _key: HMACKey = "";

    private _keyParams: PBKDF2Params = {
        algorithm: "PBKDF2",
        hash: "SHA-256",
        keySize: 256,
        iterations: 1e6,
        salt: ""
    };

    private _signingParams: HMACParams = {
        algorithm: "HMAC",
        hash: "SHA-256",
        keySize: 256
    };

    private _secretData = new SimpleContainer();
    private get _secretSerializer() {
        return {
            serialize: async () => {
                return {
                    secret: this.secret,
                    expires: this.expires
                };
            },
            deserialize: async (raw: any) => {
                this.secret = raw.secret;
                this.expires = raw.expires;
                return this;
            }
        };
    }

    constructor(public email = "", public purpose = "join_vault") {}

    async initialize(vault: VaultInfo, invitor: AccountInfo, encKey: AESKey, duration = 12) {
        this.id = uuid();
        this.expires = new Date(Date.now() + 1000 * 60 * 60 * duration);
        this.secret = base64ToHex(await getProvider().randomBytes(4));
        this._secretData.key = encKey;
        await this._secretData.set(this._secretSerializer);
        this._keyParams.salt = await getProvider().randomBytes(16);
        this.vault = await this._sign(vault);
        this.invitor = invitor;
    }

    async serialize() {
        return {
            id: this.id,
            created: this.created,
            expires: this.expires,
            updated: this.updated,
            email: this.email,
            purpose: this.purpose,
            keyParams: this._keyParams,
            signingParams: this._signingParams,
            vault: this.vault,
            invitee: this.invitee,
            invitor: this.invitor,
            secretData: await this._secretData.serialize()
        };
    }

    async deserialize(raw: any) {
        this.id = raw.id;
        this.created = raw.created;
        this.expires = raw.expires;
        this.updated = raw.updated;
        this.email = raw.email;
        this.purpose = raw.purpose;
        this._keyParams = raw.keyParams;
        this._signingParams = raw.signingParams;
        this.vault = raw.vault;
        this.invitee = raw.invitee;
        this.invitor = raw.invitor;
        await this._secretData.deserialize(raw.secretData);
        return this;
    }

    async accept(account: AccountInfo, secret: string): Promise<boolean> {
        this.secret = secret;
        const verified = this.vault && (await this._verify(this.vault));
        if (verified) {
            this.invitee = (await this._sign(account)) as SignedAccountInfo;
            this.updated = new Date();
            return true;
        } else {
            this.secret = "";
            return false;
        }
    }

    async verify(): Promise<boolean | undefined> {
        if (!this.secret || !this.vault || !this.invitee) {
            return undefined;
        }
        return (await this._verify(this.vault)) && (await this._verify(this.invitee));
    }

    async accessSecret(key: AESKey) {
        this._secretData.key = key;
        await this._secretData.get(this._secretSerializer);
    }

    private async _getKey() {
        if (!this._key) {
            this._key = (await getProvider().deriveKey(this.secret, this._keyParams)) as HMACKey;
        }
        return this._key;
    }

    private async _sign(obj: VaultInfo): Promise<SignedVaultInfo>;
    private async _sign(obj: AccountInfo): Promise<SignedAccountInfo>;
    private async _sign(obj: VaultInfo | AccountInfo): Promise<SignedVaultInfo | SignedAccountInfo> {
        const signedPublicKey = await getProvider().sign(await this._getKey(), obj.publicKey, this._signingParams);
        return Object.assign(obj, { signedPublicKey });
    }

    private async _verify(obj: SignedVaultInfo | SignedAccountInfo): Promise<boolean> {
        return await getProvider().verify(
            await this._getKey(),
            obj.signedPublicKey,
            obj.publicKey,
            this._signingParams
        );
    }
}

export class InviteCollection extends Collection<Invite> {
    async serialize() {
        return {
            ...(await super.serialize()),
            items: await Promise.all([...this].map(item => item.serialize()))
        };
    }

    async deserialize(raw: any) {
        return super.deserialize({
            ...raw,
            items: await Promise.all(raw.items.map((item: any) => new Invite().deserialize(item)))
        });
    }
}
