import { getProvider, PBKDF2Params, HMACParams, HMACKey } from "./crypto";
import { DateString, Serializable, base64ToHex } from "./encoding";
import { GroupInfo, SignedGroupInfo } from "./group";
import { AccountInfo, SignedAccountInfo } from "./auth";
import { uuid } from "./util";

export type InviteStatus = "created" | "initialized" | "sent" | "accepted" | "canceled" | "rejected" | "failed";

export class Invite implements Serializable {
    id: string = "";
    created: DateString = "";
    expires: DateString = "";
    status = "created";

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

    constructor(public email = "") {}

    async initialize(group: GroupInfo, invitor: AccountInfo, duration = 1, secret?: string) {
        this.id = uuid();
        this.created = new Date().toISOString();
        this.expires = new Date(new Date().getTime() + 1000 * 60 * 60 * duration).toISOString();
        this.secret = secret || base64ToHex(await getProvider().randomBytes(4));
        this._keyParams.salt = await getProvider().randomBytes(16);
        this.group = await this._sign(group);
        this.invitor = invitor;
        this.status = "initialized";
    }

    async serialize() {
        return {
            id: this.id,
            created: this.created,
            expires: this.expires,
            email: this.email,
            keyParams: this._keyParams,
            signingParams: this._signingParams,
            group: this.group,
            invitee: this.invitee,
            invitor: this.invitor
        };
    }

    async deserialize(raw: any) {
        this.id = raw.id;
        this.created = raw.created;
        this.expires = raw.expires;
        this.email = raw.email;
        this._keyParams = raw.keyParams;
        this._signingParams = raw.signingParams;
        this.group = raw.group;
        this.invitee = raw.invitee;
        this.invitor = raw.invitor;
        return this;
    }

    async accept(account: AccountInfo, secret: string): Promise<boolean> {
        this.secret = secret;
        this.invitee = await this._sign(account);
        return await this.verify();
        this.status = "accepted";
    }

    async verify(): Promise<boolean> {
        return (
            !this.expired &&
            !!this.group &&
            !!this.invitee &&
            (await this._verify(this.group)) &&
            (await this._verify(this.invitee))
        );
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
