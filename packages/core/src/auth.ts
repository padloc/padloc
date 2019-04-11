import { Serializable, stringToBytes, base64ToBytes, bytesToBase64 } from "./encoding";
import { getProvider, PBKDF2Params } from "./crypto";
import { Storable } from "./storage";
import { AccountID } from "./account";
import { randomNumber } from "./util";

/**
 * Contains authentication data needed for SRP session negotiation
 */
export class Auth extends Serializable implements Storable {
    /** Id of the [[Account]] the authentication data belongs to */
    account: AccountID = "";

    /** Verifier used for SRP session negotiation */
    verifier?: Uint8Array;

    /**
     * Key derivation params used by the client to compute session key from the
     * users master password
     * */
    keyParams = new PBKDF2Params();

    get id() {
        return this.email;
    }

    constructor(public email: string = "") {
        super();
    }

    toRaw() {
        return {
            ...super.toRaw(),
            verifier: this.verifier ? bytesToBase64(this.verifier) : undefined
        };
    }

    validate() {
        return (
            typeof this.email === "string" &&
            typeof this.account === "string" &&
            (typeof this.verifier === "undefined" || this.verifier instanceof Uint8Array)
        );
    }

    fromRaw({ email, account, verifier, keyParams }: any) {
        return super.fromRaw({
            email,
            account,
            verifier: (verifier && base64ToBytes(verifier)) || undefined,
            keyParams: new PBKDF2Params().fromRaw(keyParams)
        });
    }

    /**
     * Generate the session key from the users master `password`
     */
    async getAuthKey(password: string) {
        // If no salt is set yet (i.e. during initialization),
        // generate a random value
        if (!this.keyParams.salt.length) {
            this.keyParams.salt = await getProvider().randomBytes(16);
        }
        return getProvider().deriveKey(stringToBytes(password), this.keyParams);
    }
}

export type EmailVerificationPurpose = "create_account" | "recover_account";

/**
 * Class for storing email verification data. Email verificatiion is used
 * to prove ownership of the email address in question and as a authentication
 * mechanism.
 */
export class EmailVerification extends Serializable implements Storable {
    /** Time of creation */
    created = new Date();

    /**
     * Email verification code. This code is sent to the user via email
     * through [[API.requestEmailVerification]]
     */
    code: string = "";

    /**
     * Verification token that can be exchanged for the verification code via [[API.completeEmailVerification]]
     */
    token: string = "";

    /**
     * Number of failed tries
     */
    tries: number = 0;

    get id() {
        return this.email;
    }

    constructor(
        /** The email to be verified */
        public email: string,
        /** The verification purpose */
        public purpose: EmailVerificationPurpose = "create_account"
    ) {
        super();
    }

    async init() {
        const len = 6;
        // Create random 6-digit verification code
        this.code = (await randomNumber(0, Math.pow(10, len) - 1)).toString().padStart(len, "0");
        // Create random 16-byte verification token
        this.token = bytesToBase64(await getProvider().randomBytes(16));
        this.tries = 0;
    }

    validate() {
        return (
            typeof this.email === "string" &&
            typeof this.code === "string" &&
            typeof this.token === "string" &&
            ["create_account", "recover_account"].includes(this.purpose) &&
            typeof this.tries === "number" &&
            this.created instanceof Date
        );
    }

    fromRaw({ email, code, token, created, purpose, tries }: any) {
        return super.fromRaw({
            email,
            code,
            token,
            purpose,
            tries,
            created: new Date(created)
        });
    }
}
