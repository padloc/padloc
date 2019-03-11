import { getProvider, PBKDF2Params, HMACParams, HMACKey } from "./crypto";
import { SimpleContainer } from "./container";
import { stringToBytes, bytesToString, bytesToHex, bytesToBase64, base64ToBytes, marshal, unmarshal } from "./encoding";
import { Account, AccountID } from "./account";
import { Org, OrgID } from "./org";
import { uuid } from "./util";

export type InvitePurpose = "join_org" | "confirm_membership";

export type InviteID = string;

export class Invite extends SimpleContainer {
    id: InviteID = "";
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
        email: string;
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
        this._signingKey = null;
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
    private _signingKey: HMACKey | null = null;

    signingKeyParams = new PBKDF2Params({
        iterations: 1e6
    });

    signingParams = new HMACParams();

    constructor(public email = "", public purpose: InvitePurpose = "join_org") {
        super();
    }

    async initialize(org: Org, invitor: Account, duration = 12) {
        this.id = uuid();
        this.expires = new Date(Date.now() + 1000 * 60 * 60 * duration);
        this.secret = bytesToHex(await getProvider().randomBytes(4));
        this._key = org.invitesKey;
        await this.setData(stringToBytes(marshal({ secret: this.secret, expires: this.expires })));
        this.signingKeyParams.salt = await getProvider().randomBytes(16);
        this.org = await this._sign({ id: org.id, name: org.name, publicKey: org.publicKey });
        this.invitedBy = { id: invitor.id, email: invitor.email, name: invitor.name };
    }

    validate() {
        return (
            super.validate() &&
            (typeof this.id === "string" &&
                typeof this.email === "string" &&
                ["join_org", "confirm_membership"].includes(this.purpose) &&
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
                typeof this.invitedBy.email === "string")
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
        signingKeyParams,
        signingParams,
        ...rest
    }: any) {
        this.signingKeyParams.fromRaw(signingKeyParams);
        this.signingParams.fromRaw(signingParams);
        Object.assign(this, {
            id,
            email,
            purpose,
            org: org && {
                ...org,
                publicKey: base64ToBytes(org.publicKey),
                signedPublicKey: base64ToBytes(org.signedPublicKey)
            },
            invitee: invitee && {
                ...invitee,
                publicKey: base64ToBytes(invitee.publicKey),
                signedPublicKey: base64ToBytes(invitee.signedPublicKey)
            },
            invitedBy,
            created: new Date(created),
            expires: new Date(expires)
        });
        return super.fromRaw(rest);
    }

    toRaw() {
        return {
            ...super.toRaw(),
            org: this.org && {
                ...this.org,
                publicKey: bytesToBase64(this.org.publicKey),
                signedPublicKey: bytesToBase64(this.org.signedPublicKey)
            },
            invitee: this.invitee && {
                ...this.invitee,
                publicKey: bytesToBase64(this.invitee.publicKey),
                signedPublicKey: bytesToBase64(this.invitee.signedPublicKey)
            }
        };
    }

    async accept(account: Account, secret: string): Promise<boolean> {
        this.secret = secret;
        const verified = this.org && (await this._verify(this.org));
        if (verified) {
            this.invitee = await this._sign({
                id: account.id,
                name: account.name,
                email: account.email,
                publicKey: account.publicKey
            });
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

    async unlock(key: Uint8Array) {
        await super.unlock(key);
        const { secret, expires } = unmarshal(bytesToString(await this.getData()));
        this.secret = secret;
        this.expires = new Date(expires);
    }

    private async _getKey() {
        if (!this._signingKey) {
            this._signingKey = (await getProvider().deriveKey(
                stringToBytes(this.secret),
                this.signingKeyParams
            )) as HMACKey;
        }
        return this._signingKey;
    }

    private async _sign<T extends { publicKey: Uint8Array }>(obj: T): Promise<T & { signedPublicKey: Uint8Array }> {
        const signedPublicKey = await getProvider().sign(await this._getKey(), obj.publicKey, this.signingParams);
        return Object.assign(obj, { signedPublicKey });
    }

    private async _verify(obj: { publicKey: Uint8Array; signedPublicKey: Uint8Array }): Promise<boolean> {
        return await getProvider().verify(await this._getKey(), obj.signedPublicKey, obj.publicKey, this.signingParams);
    }
}
