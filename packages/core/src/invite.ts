import { getProvider, PBKDF2Params, HMACParams, HMACKey } from "./crypto";
import { SimpleContainer } from "./container";
import {
    stringToBytes,
    bytesToString,
    bytesToHex,
    bytesToBase64,
    base64ToBytes,
    marshal,
    unmarshal,
    concatBytes
} from "./encoding";
import { Account, AccountID } from "./account";
import { Org, OrgID } from "./org";
import { uuid } from "./util";
import { Err, ErrorCode } from "./error";

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
        signature: Uint8Array;
    };

    invitee: {
        id: AccountID;
        name: string;
        email: string;
        publicKey: Uint8Array;
        signature: Uint8Array;
        orgSignature: Uint8Array;
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
        this.id = await uuid();
        this.invitedBy = { id: invitor.id, email: invitor.email, name: invitor.name };

        // Generate secret
        this.secret = bytesToHex(await getProvider().randomBytes(4));
        // Set expiration time (12 hours from now)
        this.expires = new Date(Date.now() + 1000 * 60 * 60 * duration);

        // Encrypt secret and expiration date (the expiration time is also stored/transmitted
        // in plain text, encrypting it will allow verifying it wasn't tempered with later)
        this._key = org.invitesKey;
        await this.setData(stringToBytes(marshal({ secret: this.secret, expires: this.expires })));

        // Initialize signing params
        this.signingKeyParams.salt = await getProvider().randomBytes(16);

        // Create org signature using key derived from secret (see `_getSigningKey`)
        this.org = {
            id: org.id,
            name: org.name,
            publicKey: org.publicKey,
            signature: await this._sign(concatBytes(stringToBytes(org.id), org.publicKey))
        };
    }

    async unlock(key: Uint8Array) {
        await super.unlock(key);
        const { secret, expires } = unmarshal(bytesToString(await this.getData()));
        this.secret = secret;

        // Verify that expiration time has not been tempered with
        if (this.expires.getTime() !== new Date(expires).getTime()) {
            throw new Err(ErrorCode.VERIFICATION_ERROR);
        }

        this.expires = new Date(expires);
    }

    lock() {
        super.lock();
        delete this.secret;
        delete this._signingKey;
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
                signature: base64ToBytes(org.signature)
            },
            invitee: invitee && {
                ...invitee,
                publicKey: base64ToBytes(invitee.publicKey),
                signature: base64ToBytes(invitee.signature),
                orgSignature: base64ToBytes(invitee.orgSignature)
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
                signature: bytesToBase64(this.org.signature)
            },
            invitee: this.invitee && {
                ...this.invitee,
                publicKey: bytesToBase64(this.invitee.publicKey),
                signature: bytesToBase64(this.invitee.signature),
                orgSignature: bytesToBase64(this.invitee.orgSignature)
            }
        };
    }

    async accept(account: Account, secret: string): Promise<boolean> {
        this.secret = secret;

        // Verify org signature
        if (!(await this.verifyOrg())) {
            this.secret = "";
            return false;
        }

        this.invitee = {
            id: account.id,
            name: account.name,
            email: account.email,
            publicKey: account.publicKey,
            // this is used by the organization owner to verify the invitees public key
            signature: await this._sign(
                concatBytes(stringToBytes(account.id), stringToBytes(account.email), account.publicKey)
            ),
            // this is used by member later to verify the organization public key
            orgSignature: await account.signOrg(this.org)
        };

        return true;
    }

    async verifyOrg(): Promise<boolean> {
        if (!this.org) {
            throw "Invite needs to be initialized first!";
        }

        return (
            this.expires > new Date() &&
            this._verify(this.org.signature, concatBytes(stringToBytes(this.org.id), this.org.publicKey))
        );
    }

    async verifyInvitee(): Promise<boolean> {
        if (!this.invitee) {
            throw "Invite needs to be accepted first!";
        }

        return (
            this.expires > new Date() &&
            this._verify(
                this.invitee.signature,
                concatBytes(stringToBytes(this.invitee.id), stringToBytes(this.invitee.email), this.invitee.publicKey)
            )
        );
    }

    private async _getSigningKey() {
        if (!this._signingKey) {
            this._signingKey = (await getProvider().deriveKey(
                stringToBytes(this.secret),
                this.signingKeyParams
            )) as HMACKey;
        }
        return this._signingKey;
    }

    private async _sign(val: Uint8Array): Promise<Uint8Array> {
        return getProvider().sign(await this._getSigningKey(), val, this.signingParams);
    }

    private async _verify(sig: Uint8Array, val: Uint8Array): Promise<boolean> {
        return await getProvider().verify(await this._getSigningKey(), sig, val, this.signingParams);
    }
}
