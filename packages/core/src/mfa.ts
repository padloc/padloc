import { Serializable, bytesToBase64, AsDate } from "./encoding";
import { Err, ErrorCode } from "./error";
import { MFAMessage } from "./messages";
import { Messenger } from "./messenger";
import { getCryptoProvider as getProvider } from "./platform";
import { Storable } from "./storage";
import { randomNumber, uuid } from "./util";

export enum MFAPurpose {
    Signup = "signup",
    Login = "login",
    Recover = "recover",
    GetLegacyData = "get_legacy_data",
}

export enum MFAType {
    Email = "email",
    WebAuthn = "webauthn",
}

export enum MFAMethodStatus {
    Requested = "requested",
    Active = "active",
    Revoked = "revoked",
}

export class MFAMethod extends Serializable {
    /** Time of creation */
    @AsDate()
    created = new Date();

    id: string = "";

    type: MFAType = MFAType.Email;

    status: MFAMethodStatus = MFAMethodStatus.Requested;

    data: any = {};

    constructor(type: MFAType) {
        super();
        this.type = type;
    }

    async init() {
        this.id = await uuid();
        this.created = new Date();
    }
}

export class MFARequest extends Serializable {
    id: string = "";

    /** Time of creation */
    @AsDate()
    created!: Date;

    type: MFAType = MFAType.Email;

    purpose: MFAPurpose = MFAPurpose.Login;

    token: string = "";

    data: any = {};

    tries = 0;

    constructor(
        /** The verification purpose */
        purpose: MFAPurpose,
        type: MFAType
    ) {
        super();
        this.purpose = purpose;
        this.type = type;
    }

    async init() {
        this.id = await uuid();
        this.created = new Date();
        // Create random 6-digit verification code
        // Create random 16-byte verification token
        this.token = bytesToBase64(await getProvider().randomBytes(16));
        this.tries = 0;
    }
}

export interface MFAProvider {
    supportsType(type: MFAType): boolean;

    initMFAMethod(method: MFAMethod, params?: any): Promise<any>;

    activateMFAMethod(method: MFAMethod, params?: any): Promise<any>;

    initMFARequest(method: MFAMethod, request: MFARequest, params?: any): Promise<any>;

    verifyMFARequest(method: MFAMethod, request: MFARequest, params?: any): Promise<boolean>;
}

export class EmailMFAProvider implements MFAProvider {
    constructor(public messenger: Messenger) {}

    supportsType(type: MFAType) {
        return type === MFAType.Email;
    }

    async initMFAMethod(method: MFAMethod, { email }: { email: string }) {
        const activationCode = await this._generateCode();
        method.data = {
            email,
            activationCode,
        };
        this.messenger.send(email, new MFAMessage(activationCode));
        return {};
    }

    async activateMFAMethod(method: MFAMethod, { code: activationCode }: { code: string }) {
        if (activationCode !== method.data.activationCode) {
            throw new Err(ErrorCode.MFA_FAILED, "Failed to activate MFA Method. Incorrect activation code!");
        }
        return {};
    }

    async initMFARequest(method: MFAMethod, request: MFARequest) {
        const verificationCode = await this._generateCode();
        request.data = {
            verificationCode,
        };
        this.messenger.send(method.data.email, new MFAMessage(verificationCode));
        return {};
    }

    async verifyMFARequest(_method: MFAMethod, request: MFARequest, { code: verificationCode }: { code: string }) {
        return request.data.verificationCode === verificationCode;
    }

    private async _generateCode(len = 6) {
        return (await randomNumber(0, Math.pow(10, len) - 1)).toString().padStart(len, "0");
    }
}

/**
 * Class for storing email verification data. Email verificatiion is used
 * to prove ownership of the email address in question and as a authentication
 * mechanism.
 * @deprecated since v4.0. Please use [[ MFARequest ]] instead
 */
export class EmailMFARequest extends Serializable implements Storable {
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
