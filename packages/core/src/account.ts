import {
    bytesToString,
    stringToBytes,
    base64ToBytes,
    bytesToBase64,
    concatBytes,
    marshal,
    unmarshal
} from "./encoding";
import { RSAPublicKey, RSAPrivateKey, RSAKeyParams, HMACKey, HMACParams, HMACKeyParams } from "./crypto";
import { getCryptoProvider as getProvider } from "./platform";
import { Err, ErrorCode } from "./error";
import { PBES2Container } from "./container";
import { Storable } from "./storage";
import { SessionInfo } from "./session";
import { VaultID } from "./vault";
import { Org, OrgID } from "./org";
import { AccountQuota } from "./quota";
import { BillingInfo } from "./billing";

/** Unique identifier for [[Account]] objects */
export type AccountID = string;

/**
 * The `Account` object represents an individual Padloc user and holds general
 * account information as well as cryptographic keys necessary for accessing
 * [[Vaults]] and signing/verifying [[Org]]anization details.
 *
 * The [[privateKey]] and [[signingKey]] properties are considered secret and
 * therefore need to be encrypted at rest. For this, the [[Account]] object
 * serves as a [[PBESContainer]] which is unlocked by the users **master
 * password**.
 */
export class Account extends PBES2Container implements Storable {
    /** Unique account ID */
    id: AccountID = "";

    /** The users email address */
    email = "";

    /** The users display name */
    name = "";

    /** When the account was created */
    created = new Date();

    /** when the account was last updated */
    updated = new Date();

    /** The accounts public key */
    publicKey!: RSAPublicKey;

    /**
     * The accounts private key
     *
     * @secret
     * **IMPORTANT**: This property is considered **secret**
     * and should never stored or transmitted in plain text
     */
    privateKey!: RSAPrivateKey;

    /**
     * HMAC key used for signing and verifying organization details
     *
     * **IMPORTANT**: This property is considered **secret**
     * and should never stored or transmitted in plain text
     *
     * @secret
     */
    signingKey!: HMACKey;

    /** ID of the accounts main or "private" [[Vault]]. */
    mainVault: VaultID = "";

    /** List of currently active sessions */
    sessions: SessionInfo[] = [];

    /** IDs of all organizations this account is a member of */
    orgs: OrgID[] = [];

    /**
     * Revision id used for ensuring continuity when synchronizing the account
     * object between client and server
     */
    revision: string = "";

    quota: AccountQuota = new AccountQuota();

    billing?: BillingInfo;

    usedStorage: number = 0;

    /**
     * Whether or not this Account object is current "locked" or, in other words,
     * whether the `privateKey` and `signingKey` properties have been decrypted.
     */
    get locked(): boolean {
        return !this.privateKey;
    }

    get masterKey() {
        return this._key;
    }

    set masterKey(key: Uint8Array | undefined) {
        this._key = key;
    }

    /**
     * Generates the accounts [[privateKey]], [[publicKey]] and [[signingKey]] and
     * encrypts [[privateKey]] and [[singingKey]] using the master password.
     */
    async initialize(password: string) {
        const { publicKey, privateKey } = await getProvider().generateKey(new RSAKeyParams());
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.signingKey = await getProvider().generateKey(new HMACKeyParams());
        await this.setPassword(password);
    }

    /** Updates the master password by reencrypting the [[privateKey]] and [[signingKey]] properties */
    async setPassword(password: string) {
        await super.unlock(password);
        await this.setData(
            stringToBytes(
                marshal({ privateKey: bytesToBase64(this.privateKey), signingKey: bytesToBase64(this.signingKey) })
            )
        );
        this.updated = new Date();
    }

    /**
     * "Unlocks" the account by decrypting and extracting [[privateKey]] and
     * [[signingKey]] from [[encryptedData]]
     */
    async unlock(password: string) {
        await super.unlock(password);
        await this._loadKeys();
    }

    /**
     * Unlocks the account by providing the encryption key directly rather than
     * deriving it fro the master password
     */
    async unlockWithMasterKey(key: Uint8Array) {
        this._key = key;
        await this._loadKeys();
    }

    /**
     * "Locks" the account by deleting all sensitive data from the object
     */
    lock() {
        super.lock();
        delete this.privateKey;
        delete this.signingKey;
    }

    validate() {
        return (
            super.validate() &&
            (typeof this.id === "string" &&
                typeof this.email === "string" &&
                typeof this.name === "string" &&
                typeof this.mainVault === "string" &&
                typeof this.revision === "string" &&
                typeof this.usedStorage === "number" &&
                this.created instanceof Date &&
                this.updated instanceof Date &&
                this.publicKey instanceof Uint8Array &&
                this.orgs.every(id => typeof id === "string"))
        );
    }

    toRaw(): any {
        return {
            ...super.toRaw(["privateKey", "signingKey"]),
            publicKey: bytesToBase64(this.publicKey)
        };
    }

    fromRaw({
        id,
        created,
        updated,
        email,
        name,
        mainVault,
        publicKey,
        orgs,
        revision,
        sessions,
        quota,
        billing,
        usedStorage,
        ...rest
    }: any) {
        Object.assign(this, {
            id,
            email,
            name,
            mainVault,
            revision,
            created: new Date(created),
            updated: new Date(updated),
            publicKey: base64ToBytes(publicKey),
            quota: new AccountQuota().fromRaw(quota),
            billing: billing && new BillingInfo().fromRaw(billing),
            orgs,
            sessions,
            usedStorage: usedStorage || 0
        });
        return super.fromRaw(rest);
    }

    clone() {
        const clone = super.clone();
        clone.privateKey = this.privateKey;
        clone.signingKey = this.signingKey;
        clone._key = this._key;
        return clone;
    }

    toString() {
        return this.name || this.email;
    }

    /**
     * Creates a signature that can be used later to verify an organizations id and public key
     */
    async signOrg({ id, publicKey }: { id: string; publicKey: Uint8Array }) {
        return getProvider().sign(this.signingKey, concatBytes([stringToBytes(id), publicKey], 0x00), new HMACParams());
    }

    /**
     * Verifies an organizations id an public key, using the signature stored
     * in the [[Member]] object associated with the account.
     */
    async verifyOrg(org: Org): Promise<void> {
        if (!this.signingKey) {
            throw "Account needs to be unlocked first";
        }

        const member = org.getMember(this);

        if (!member) {
            throw new Err(ErrorCode.VERIFICATION_ERROR, "Account is not a member.");
        }

        const verified = await getProvider().verify(
            this.signingKey,
            member.orgSignature,
            concatBytes([stringToBytes(org.id), org.publicKey], 0x00),
            new HMACParams()
        );

        if (!verified) {
            throw new Err(ErrorCode.VERIFICATION_ERROR, `Failed to verify public key of ${org.name}!`);
        }
    }

    private async _loadKeys() {
        const { privateKey, signingKey } = unmarshal(bytesToString(await this.getData()));
        this.privateKey = base64ToBytes(privateKey);
        this.signingKey = base64ToBytes(signingKey);
    }
}
