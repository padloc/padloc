import { Serializable, bytesToBase64, AsDate } from "./encoding";
import { getCryptoProvider as getProvider } from "./platform";
import { Storable } from "./storage";
import { randomNumber } from "./util";

export enum MFAPurpose {
    Signup,
    Login,
    Recover,
    GetLegacyData
}

export enum MFAType {
    Email
}

/**
 * Class for storing email verification data. Email verificatiion is used
 * to prove ownership of the email address in question and as a authentication
 * mechanism.
 */
export class MFARequest extends Serializable implements Storable {
    /** Time of creation */
    @AsDate()
    created = new Date();

    /**
     * MFA verification code. This code is sent to the user via email
     * through [[API.requestMFACode]]
     */
    code: string = "";

    /**
     * MFA token that can be exchanged for the MFA code via [[API.retrieveMFAToken]]
     */
    token: string = "";

    /**
     * Number of failed tries
     */
    tries: number = 0;

    get id() {
        return `${this.email}_${this.purpose}`;
    }

    constructor(
        /** The email to be verified */
        public email: string,
        /** The verification purpose */
        public purpose: MFAPurpose,
        public type: MFAType = MFAType.Email
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
}
