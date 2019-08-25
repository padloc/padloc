import { Serializable, bytesToBase64 } from "./encoding";
import { getCryptoProvider as getProvider } from "./platform";
import { Storable } from "./storage";
import { randomNumber } from "./util";

export enum EmailVerificationPurpose {
    Signup,
    Login,
    Recover
}

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
        public purpose: EmailVerificationPurpose = EmailVerificationPurpose.Signup
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
            this.purpose in EmailVerificationPurpose &&
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
