import { Serializable, bytesToBase64, AsDate, AsSerializable } from "./encoding";
import { Err, ErrorCode } from "./error";
import { MFAMessage } from "./messages";
import { Messenger } from "./messenger";
import { DeviceInfo, getCryptoProvider as getProvider } from "./platform";
import { Storable } from "./storage";
import { randomNumber, uuid } from "./util";
import { Account } from "./account";

export enum MFAPurpose {
    Signup = "signup",
    Login = "login",
    Recover = "recover",
    GetLegacyData = "get_legacy_data",
    AccessKeyStore = "access_key_store",
}

export enum MFAType {
    Email = "email",
    WebAuthn = "webauthn",
}

export enum MFAuthenticatorStatus {
    Requested = "requested",
    Active = "active",
    Revoked = "revoked",
}

export class MFAuthenticator<T = any> extends Serializable {
    /** Time of creation */
    @AsDate()
    created = new Date();

    @AsDate()
    lastUsed?: Date;

    id: string = "";

    type: MFAType = MFAType.Email;

    purposes: MFAPurpose[] = [];

    status: MFAuthenticatorStatus = MFAuthenticatorStatus.Requested;

    data?: T = undefined;

    constructor(init: Partial<MFAuthenticator> = {}) {
        super();
        Object.assign(this, init);
    }

    async init() {
        this.id = await uuid();
        this.created = new Date();
    }
}

export enum MFARequestStatus {
    Started = "started",
    Verified = "verified",
    Canceled = "canceled",
}

export class MFARequest<T = any> extends Serializable {
    id: string = "";

    /** Time of creation */
    @AsDate()
    created!: Date;

    @AsDate()
    verified!: Date;

    type: MFAType = MFAType.Email;

    @AsSerializable(DeviceInfo)
    device?: DeviceInfo = undefined;

    authenticatorId: string = "";

    purpose: MFAPurpose = MFAPurpose.Login;

    token: string = "";

    data?: T = undefined;

    tries = 0;

    status: MFARequestStatus = MFARequestStatus.Started;

    constructor(init: Partial<MFARequest> = {}) {
        super();
        Object.assign(this, init);
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

export interface MFAServer {
    supportsType(type: MFAType): boolean;

    initMFAuthenticator(account: Account, authenticator: MFAuthenticator, params?: any): Promise<any>;

    activateMFAuthenticator(authenticator: MFAuthenticator, params?: any): Promise<any>;

    initMFARequest(authenticator: MFAuthenticator, request: MFARequest, params?: any): Promise<any>;

    verifyMFARequest(authenticator: MFAuthenticator, request: MFARequest, params?: any): Promise<boolean>;
}

export interface MFAClient {
    supportsType(type: MFAType): boolean;
    prepareAttestation(serverData: any, clientData: any): Promise<any>;
    prepareAssertion(serverData: any, clientData: any): Promise<any>;
}

export class MessengerMFAProvider implements MFAServer {
    constructor(public messenger: Messenger) {}

    supportsType(type: MFAType) {
        return type === MFAType.Email;
    }

    async initMFAuthenticator(
        account: Account,
        method: MFAuthenticator,
        { email = account.email }: { email?: string }
    ) {
        const activationCode = await this._generateCode();
        method.data = {
            email: email,
            activationCode,
        };
        this.messenger.send(email, new MFAMessage(activationCode));
        return {};
    }

    async activateMFAuthenticator(method: MFAuthenticator, { code: activationCode }: { code: string }) {
        if (activationCode !== method.data.activationCode) {
            throw new Err(ErrorCode.MFA_FAILED, "Failed to activate MFA Method. Incorrect activation code!");
        }
        return {};
    }

    async initMFARequest(method: MFAuthenticator, request: MFARequest) {
        const verificationCode = await this._generateCode();
        request.data = {
            verificationCode,
        };
        this.messenger.send(method.data.email, new MFAMessage(verificationCode));
        return {};
    }

    async verifyMFARequest(
        _method: MFAuthenticator,
        request: MFARequest,
        { code: verificationCode }: { code: string }
    ) {
        return (
            !!request.data.verificationCode && !!verificationCode && request.data.verificationCode === verificationCode
        );
    }

    private async _generateCode(len = 6) {
        return (await randomNumber(0, Math.pow(10, len) - 1)).toString().padStart(len, "0");
    }
}

export class MessengerMFACLient implements MFAClient {
    supportsType(type: MFAType) {
        return type === MFAType.Email;
    }

    async prepareAttestation(_serverData: undefined, clientData: { code: string }) {
        return clientData;
    }

    async prepareAssertion(_serverData: undefined, clientData: { code: string }) {
        return clientData;
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
