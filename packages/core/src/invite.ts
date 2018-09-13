import { getProvider, PBKDF2Params, HMACParams, HMACKey, SimpleContainer, AESKey } from "./crypto";
import { DateString, Serializable, base64ToHex } from "./encoding";
import { GroupInfo, SignedGroupInfo } from "./group";
import { AccountInfo, SignedAccountInfo } from "./auth";
import { uuid } from "./util";

export class Invite implements Serializable {
    id: string = "";
    created: DateString = new Date().toISOString();
    updated: DateString = new Date().toISOString();
    expires: DateString = "";

    group: SignedGroupInfo | null = null;
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

    constructor(public email = "") {}

    async initialize(group: GroupInfo, invitor: AccountInfo, encKey: AESKey, duration = 1) {
        this.id = uuid();
        this.expires = new Date(new Date().getTime() + 1000 * 60 * 60 * duration).toISOString();
        this.secret = base64ToHex(await getProvider().randomBytes(4));
        this._secretData.key = encKey;
        await this._secretData.set(this._secretSerializer);
        this._keyParams.salt = await getProvider().randomBytes(16);
        this.group = await this._sign(group);
        this.invitor = invitor;
    }

    async serialize() {
        return {
            id: this.id,
            created: this.created,
            expires: this.expires,
            updated: this.updated,
            email: this.email,
            keyParams: this._keyParams,
            signingParams: this._signingParams,
            group: this.group,
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
        this._keyParams = raw.keyParams;
        this._signingParams = raw.signingParams;
        this.group = raw.group;
        this.invitee = raw.invitee;
        this.invitor = raw.invitor;
        await this._secretData.deserialize(raw.secretData);
        return this;
    }

    async accept(account: AccountInfo, secret: string): Promise<boolean> {
        this.secret = secret;
        this.invitee = await this._sign(account);
        this.updated = new Date().toISOString();
        const verified = await this.verify();
        return verified === true;
    }

    async verify(): Promise<boolean | undefined> {
        if (!this.secret || !this.group || !this.invitee) {
            return undefined;
        }
        return (await this._verify(this.group)) && (await this._verify(this.invitee));
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

    private async _sign(obj: GroupInfo): Promise<SignedGroupInfo>;
    private async _sign(obj: AccountInfo): Promise<SignedAccountInfo>;
    private async _sign(obj: GroupInfo | AccountInfo): Promise<SignedGroupInfo | SignedAccountInfo> {
        const signedPublicKey = await getProvider().sign(await this._getKey(), obj.publicKey, this._signingParams);
        return Object.assign(obj, { signedPublicKey });
    }

    private async _verify(obj: SignedGroupInfo | SignedAccountInfo): Promise<boolean> {
        return await getProvider().verify(
            await this._getKey(),
            obj.signedPublicKey,
            obj.publicKey,
            this._signingParams
        );
    }
}
