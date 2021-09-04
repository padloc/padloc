import { Serializable, bytesToBase64, AsDate, AsSerializable, AsBytes, Exclude, base64ToBytes } from "./encoding";
import { Err, ErrorCode } from "./error";
import { MFAMessage } from "./messages";
import { Messenger } from "./messenger";
import {
    BiometricKeyStore,
    DeviceInfo,
    getCryptoProvider,
    getCryptoProvider as getProvider,
    getStorage,
} from "./platform";
import { Storable } from "./storage";
import { randomNumber, uuid } from "./util";
import { generateSecret, getCounter, TOTPValidationOpts, validateHotp } from "./otp";
import { base32ToBytes } from "./base32";
import { Account } from "./account";
import { Auth } from "./auth";
import { AESKeyParams, RSAKeyParams, RSAPrivateKey, RSAPublicKey, RSASigningParams } from "./crypto";
import { SimpleContainer } from "./container";

export enum MFAPurpose {
    Signup = "signup",
    Login = "login",
    Recover = "recover",
    GetLegacyData = "get_legacy_data",
    AccessKeyStore = "access_key_store",
    TestAuthenticator = "test_authenticator",
}

export enum MFAType {
    Email = "email",
    WebAuthnPlatform = "webauthn_platform",
    WebAuthnPortable = "webauthn_portable",
    Totp = "totp",
    PublicKey = "public_key",
}

export enum MFAuthenticatorStatus {
    Requested = "requested",
    Active = "active",
    Revoked = "revoked",
}

export class MFAuthenticatorInfo extends Serializable {
    /** Time of creation */
    @AsDate()
    created = new Date();

    @AsDate()
    lastUsed?: Date;

    id: string = "";

    description: string = "";

    type: MFAType = MFAType.Email;

    purposes: MFAPurpose[] = [];

    status: MFAuthenticatorStatus = MFAuthenticatorStatus.Requested;

    @AsSerializable(DeviceInfo)
    device?: DeviceInfo;

    constructor(init: Partial<MFAuthenticatorInfo> = {}) {
        super();
        Object.assign(this, init);
    }
}

export class MFAuthenticator<T = any> extends Serializable {
    /** Time of creation */
    @AsDate()
    created = new Date();

    @AsDate()
    lastUsed?: Date;

    id: string = "";

    description: string = "";

    type: MFAType = MFAType.Email;

    purposes: MFAPurpose[] = [];

    status: MFAuthenticatorStatus = MFAuthenticatorStatus.Requested;

    @AsSerializable(DeviceInfo)
    device?: DeviceInfo;

    data?: T = undefined;

    get info() {
        return new MFAuthenticatorInfo(this);
    }

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
        // Create random 16-byte verification token
        this.token = bytesToBase64(await getProvider().randomBytes(16));
        this.tries = 0;
    }
}

export interface MFAServer {
    supportsType(type: MFAType): boolean;

    initMFAuthenticator(authenticator: MFAuthenticator, account: Account, auth: Auth, params?: any): Promise<any>;

    activateMFAuthenticator(authenticator: MFAuthenticator, params?: any): Promise<any>;

    initMFARequest(authenticator: MFAuthenticator, request: MFARequest, params?: any): Promise<any>;

    verifyMFARequest(authenticator: MFAuthenticator, request: MFARequest, params?: any): Promise<boolean>;
}

export interface MFAClient {
    supportsType(type: MFAType): boolean;
    prepareRegistration(serverData: any, clientData: any): Promise<any>;
    prepareAuthentication(serverData: any, clientData: any): Promise<any>;
}

export class MessengerMFAServer implements MFAServer {
    constructor(public messenger: Messenger) {}

    supportsType(type: MFAType) {
        return type === MFAType.Email;
    }

    async initMFAuthenticator(
        authenticator: MFAuthenticator,
        account: Account,
        _auth: Auth,
        { email = account.email }: { email: string }
    ) {
        const activationCode = await this._generateCode();
        authenticator.data = {
            email: email,
            activationCode,
        };
        this.messenger.send(email, new MFAMessage(activationCode));
        return {};
    }

    async activateMFAuthenticator(authenticator: MFAuthenticator, { code: activationCode }: { code: string }) {
        if (activationCode !== authenticator.data.activationCode) {
            throw new Err(ErrorCode.MFA_FAILED, "Failed to activate authenticator. Incorrect activation code!");
        }
        authenticator.description = authenticator.data.email;
        return {};
    }

    async initMFARequest(authenticator: MFAuthenticator, request: MFARequest) {
        const verificationCode = await this._generateCode();
        request.data = {
            email: authenticator.data.email,
            verificationCode,
        };
        this.messenger.send(authenticator.data.email, new MFAMessage(verificationCode));
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

    async prepareRegistration(_serverData: undefined, clientData: { code: string }) {
        return clientData;
    }

    async prepareAuthentication(_serverData: undefined, clientData: { code: string }) {
        return clientData;
    }
}

export class TotpMFAServer implements MFAServer {
    constructor(private _opts: TOTPValidationOpts = { interval: 30, digits: 6, hash: "SHA-1", window: 1 }) {}

    supportsType(type: MFAType) {
        return type === MFAType.Totp;
    }

    async initMFAuthenticator(authenticator: MFAuthenticator) {
        const secret = await generateSecret();
        authenticator.data = {
            secret,
        };
        authenticator.description = "TOTP";
        return { secret };
    }

    async activateMFAuthenticator(authenticator: MFAuthenticator, { code }: { code: string }) {
        if (!(await this._verifyCode(authenticator, code))) {
            throw new Err(ErrorCode.MFA_FAILED, "Failed to activate authenticator. Incorrect activation code!");
        }
        return {};
    }

    async initMFARequest(_authenticator: MFAuthenticator, _request: MFARequest) {
        return {};
    }

    async verifyMFARequest(authenticator: MFAuthenticator, _request: MFARequest, { code }: { code: string }) {
        return this._verifyCode(authenticator, code);
    }

    private async _verifyCode(authenticator: MFAuthenticator, code: string) {
        const secret = base32ToBytes(authenticator.data.secret);
        const counter = getCounter(Date.now(), this._opts);
        const lastCounter = authenticator.data.lastCounter || 0;
        if (counter <= lastCounter) {
            throw new Err(ErrorCode.MFA_FAILED, "Authentication request denied. Please wait for the next time window!");
        }
        const verified = await validateHotp(secret, code, counter, this._opts);
        authenticator.data.lastCounter = counter;
        return verified;
    }
}

export class TotpMFACLient implements MFAClient {
    supportsType(type: MFAType) {
        return type === MFAType.Totp;
    }

    async prepareRegistration(_serverData: undefined, clientData: { code: string }) {
        return clientData;
    }

    async prepareAuthentication(_serverData: undefined, clientData: { code: string }) {
        return clientData;
    }
}

export class PublicKeyMFAChallenge extends Serializable {
    @AsBytes()
    value!: Uint8Array;

    @AsSerializable(RSASigningParams)
    signingParams = new RSASigningParams();

    async init() {
        this.value = await getCryptoProvider().randomBytes(16);
    }
}

export class PublicKeyMFAClientData extends SimpleContainer implements Storable {
    id: string = "";

    @AsBytes()
    publicKey!: RSAPublicKey;

    @Exclude()
    privateKey?: RSAPrivateKey;

    async generateKeys() {
        const { privateKey, publicKey } = await getCryptoProvider().generateKey(new RSAKeyParams());
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        await this.setData(this.privateKey);
    }

    async unlock(key: Uint8Array) {
        await super.unlock(key);
        if (this.encryptedData) {
            this.privateKey = await this.getData();
        }
    }

    lock() {
        super.lock();
        delete this.privateKey;
    }
}

export class PublicKeyMFAClient implements MFAClient {
    constructor(private _keyStore: BiometricKeyStore) {}

    supportsType(type: MFAType) {
        return type === MFAType.PublicKey;
    }

    async prepareRegistration({ challenge: rawChallenge }: { challenge: any }) {
        const challenge = new PublicKeyMFAChallenge().fromRaw(rawChallenge);
        const data = new PublicKeyMFAClientData();
        const key = await getCryptoProvider().generateKey(new AESKeyParams());
        data.unlock(key);
        await data.generateKeys();
        await getStorage().save(data);
        await this._keyStore.storeKey("", key);
        const signedChallenge = await this._sign(data, challenge);
        return {
            publicKey: bytesToBase64(data.publicKey),
            signedChallenge: bytesToBase64(signedChallenge),
        };
    }

    async prepareAuthentication({ challenge: rawChallenge }: any) {
        const challenge = new PublicKeyMFAChallenge().fromRaw(rawChallenge);
        const data = await getStorage().get(PublicKeyMFAClientData, "");
        const key = await this._keyStore.getKey("");
        await data.unlock(key);
        const signedChallenge = await this._sign(data, challenge);
        return {
            signedChallenge: bytesToBase64(signedChallenge),
        };
    }

    private _sign(data: PublicKeyMFAClientData, challenge: PublicKeyMFAChallenge): Promise<Uint8Array> {
        if (!data.privateKey) {
            throw "No private key provided";
        }

        return getCryptoProvider().sign(data.privateKey, challenge.value, challenge.signingParams);
    }
}

export class PublicKeyMFAServer implements MFAServer {
    supportsType(type: MFAType) {
        return type === MFAType.PublicKey;
    }

    async initMFAuthenticator(authenticator: MFAuthenticator) {
        const challenge = new PublicKeyMFAChallenge();
        await challenge.init();
        authenticator.data = {
            activationChallenge: challenge.toRaw(),
        };
        authenticator.description = authenticator.device?.description || "Unknown Device Platform Authenticator";
        return {
            challenge: challenge.toRaw(),
        };
    }

    async activateMFAuthenticator(
        authenticator: MFAuthenticator<any>,
        { publicKey, signedChallenge }: { publicKey: string; signedChallenge: string }
    ): Promise<any> {
        const challenge = new PublicKeyMFAChallenge().fromRaw(authenticator.data.activationChallenge);
        if (!(await this._verify(base64ToBytes(publicKey), challenge, base64ToBytes(signedChallenge)))) {
            throw new Err(ErrorCode.MFA_FAILED, "Failed to activate authenticator. Invalid signature!");
        }
        authenticator.data = { publicKey };
        return {};
    }

    async initMFARequest(_authenticator: MFAuthenticator<any>, request: MFARequest<any>): Promise<any> {
        const challenge = new PublicKeyMFAChallenge();
        await challenge.init();
        request.data = { challenge: challenge.toRaw() };
        return {
            challenge: challenge.toRaw(),
        };
    }

    async verifyMFARequest(
        authenticator: MFAuthenticator<any>,
        request: MFARequest<any>,
        { signedChallenge: rawSignedChallenge }: { signedChallenge: string }
    ): Promise<boolean> {
        const publicKey = base64ToBytes(authenticator.data.publicKey);
        const challenge = new PublicKeyMFAChallenge().fromRaw(request.data.challenge);
        const signedChallenge = base64ToBytes(rawSignedChallenge);
        return this._verify(publicKey, challenge, signedChallenge);
    }

    private async _verify(
        publicKey: Uint8Array,
        challenge: PublicKeyMFAChallenge,
        signedChallenge: Uint8Array
    ): Promise<boolean> {
        const verified = await getCryptoProvider().verify(
            publicKey,
            signedChallenge,
            challenge.value,
            challenge.signingParams
        );
        return verified;
    }
}
