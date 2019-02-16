import { getProvider, PBKDF2Params, HMACParams, HMACKey, AESKey } from "./crypto";
import { SimpleContainer } from "./container";
import { stringToBytes, bytesToString, bytesToHex, marshal, unmarshal } from "./encoding";
import { Account, AccountID } from "./account";
import { Org, OrgID } from "./org";
import { Serializable } from "./encoding";
import { uuid } from "./util";

export type InvitePurpose = "join_vault" | "confirm_membership";

export class Invite extends Serializable {
    id: string = "";
    created = new Date();
    expires = new Date();

    org!: {
        id: OrgID;
        name: string;
        publicKey: Uint8Array;
        signedPublicKey: Uint8Array;
    };
    invitee: {
        id: AccountID;
        name: string;
        publicKey: Uint8Array;
        signedPublicKey: Uint8Array;
    } | null = null;
    invitedBy!: {
        id: AccountID;
        name: string;
        email: string;
    };

    set secret(s: string) {
        this._secret = s;
        this._key = null;
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
    private _key: HMACKey | null = null;

    keyParams = new PBKDF2Params({
        iterations: 1e6
    });

    signingParams = new HMACParams();

    secretData = new SimpleContainer();

    constructor(public email = "", public purpose: InvitePurpose = "join_vault") {
        super();
    }

    async initialize(org: Org, invitor: Account, encKey: AESKey, duration = 12) {
        this.id = uuid();
        this.expires = new Date(Date.now() + 1000 * 60 * 60 * duration);
        this.secret = bytesToHex(await getProvider().randomBytes(4));
        this.secretData.access(encKey);
        await this.secretData.setData(stringToBytes(marshal({ secret: this.secret, expires: this.expires })));
        this.keyParams.salt = await getProvider().randomBytes(16);
        this.org = await this._sign(org);
        this.invitedBy = { id: invitor.id, email: invitor.email, name: invitor.name };
    }

    validate() {
        return (
            typeof this.id === "string" &&
            typeof this.email === "string" &&
            ["join_vault", "confirm_membership"].includes(this.purpose) &&
            typeof this.org === "object" &&
            typeof this.org.id === "string" &&
            typeof this.org.name === "string" &&
            (this.invitee === null ||
                (typeof this.invitee === "object" &&
                    typeof this.invitee.id === "string" &&
                    typeof this.invitee.name === "string")) &&
            typeof this.invitedBy === "object" &&
            typeof this.invitedBy.id === "string" &&
            typeof this.invitedBy.name === "string" &&
            typeof this.invitedBy.email === "string"
        );
    }

    fromRaw({
        id,
        created,
        expires,
        email,
        purpose,
        org,
        invitee,
        invitedBy,
        keyParams,
        signingParams,
        secretData
    }: any) {
        this.keyParams.fromRaw(keyParams);
        this.signingParams.fromRaw(signingParams);
        this.secretData.fromRaw(secretData);
        return super.fromRaw({
            id,
            email,
            purpose,
            org,
            invitee,
            invitedBy,
            created: new Date(created),
            expires: new Date(expires)
        });
    }

    async accept(account: Account, secret: string): Promise<boolean> {
        this.secret = secret;
        const verified = this.org && (await this._verify(this.org));
        if (verified) {
            this.invitee = await this._sign(account);
            return true;
        } else {
            this.secret = "";
            return false;
        }
    }

    async verify(): Promise<boolean | undefined> {
        if (!this.secret || !this.org || !this.invitee) {
            return undefined;
        }
        return (await this._verify(this.org)) && (await this._verify(this.invitee));
    }

    async accessSecret(key: AESKey) {
        this.secretData.access(key);
        const { secret, expires } = unmarshal(bytesToString(await this.secretData.getData()));
        this.secret = secret;
        this.expires = expires;
    }

    private async _getKey() {
        if (!this._key) {
            this._key = (await getProvider().deriveKey(stringToBytes(this.secret), this.keyParams)) as HMACKey;
        }
        return this._key;
    }

    private async _sign<T extends { publicKey: Uint8Array }>(obj: T): Promise<T & { signedPublicKey: Uint8Array }> {
        const signedPublicKey = await getProvider().sign(await this._getKey(), obj.publicKey, this.signingParams);
        return Object.assign(obj, { signedPublicKey });
    }

    private async _verify(obj: { publicKey: Uint8Array; signedPublicKey: Uint8Array }): Promise<boolean> {
        return await getProvider().verify(await this._getKey(), obj.signedPublicKey, obj.publicKey, this.signingParams);
    }
}
