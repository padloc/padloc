import { Serializable, bytesToBase64, AsDate, AsSerializable, AsBytes, Exclude, base64ToBytes } from "./encoding";
import { Err, ErrorCode } from "./error";
import { EmailAuthMessage } from "./messages";
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
import { generateSecret, getCounter, validateHotp } from "./otp";
import { base32ToBytes } from "./base32";
import { Account } from "./account";
import { Auth } from "./auth";
import { AESKeyParams, RSAKeyParams, RSAPrivateKey, RSAPublicKey, RSASigningParams } from "./crypto";
import { SimpleContainer } from "./container";
import { Config, ConfigParam } from "./config";

export enum AuthPurpose {
    Signup = "signup",
    Login = "login",
    Recover = "recover",
    GetLegacyData = "get_legacy_data",
    AccessKeyStore = "access_key_store",
    TestAuthenticator = "test_authenticator",
}

export enum AuthType {
    Email = "email",
    WebAuthnPlatform = "webauthn_platform",
    WebAuthnPortable = "webauthn_portable",
    Totp = "totp",
    PublicKey = "public_key",
    OpenID = "openid_connect_v1",
}

export enum AuthenticatorStatus {
    Registering = "registering",
    Active = "active",
    Revoked = "revoked",
}

export class AuthenticatorInfo extends Serializable {
    /** Time of creation */
    @AsDate()
    created = new Date();

    @AsDate()
    lastUsed?: Date;

    id: string = "";

    description: string = "";

    type: AuthType = AuthType.Email;

    purposes: AuthPurpose[] = [];

    status: AuthenticatorStatus = AuthenticatorStatus.Registering;

    @AsSerializable(DeviceInfo)
    device?: DeviceInfo;

    constructor(init: Partial<AuthenticatorInfo> = {}) {
        super();
        Object.assign(this, init);
    }
}

export class Authenticator<T = any> extends Serializable {
    /** Time of creation */
    @AsDate()
    created = new Date();

    @AsDate()
    lastUsed?: Date;

    id: string = "";

    description: string = "";

    type: AuthType = AuthType.Email;

    purposes: AuthPurpose[] = [];

    status: AuthenticatorStatus = AuthenticatorStatus.Registering;

    @AsSerializable(DeviceInfo)
    device?: DeviceInfo;

    state?: T = undefined;

    get info() {
        return new AuthenticatorInfo(this);
    }

    constructor(init: Partial<Authenticator> = {}) {
        super();
        Object.assign(this, init);
    }

    async init() {
        this.id = await uuid();
        this.created = new Date();
    }
}

export enum AuthRequestStatus {
    Started = "started",
    Verified = "verified",
    Canceled = "canceled",
}

export class AuthRequest<T = any> extends Serializable {
    id: string = "";

    /** Time of creation */
    @AsDate()
    created!: Date;

    @AsDate()
    verified!: Date;

    type: AuthType = AuthType.Email;

    @AsSerializable(DeviceInfo)
    device?: DeviceInfo = undefined;

    authenticatorId: string = "";

    purpose: AuthPurpose = AuthPurpose.Login;

    token: string = "";

    state?: T = undefined;

    tries = 0;

    status: AuthRequestStatus = AuthRequestStatus.Started;

    constructor(init: Partial<AuthRequest> = {}) {
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

export interface AuthServer {
    supportsType(type: AuthType): boolean;

    initAuthenticator(authenticator: Authenticator, account: Account, auth: Auth, params?: any): Promise<any>;

    activateAuthenticator(authenticator: Authenticator, params?: any): Promise<any>;

    initAuthRequest(authenticator: Authenticator, request: AuthRequest, params?: any): Promise<any>;

    verifyAuthRequest(authenticator: Authenticator, request: AuthRequest, params?: any): Promise<boolean>;
}

export interface AuthClient {
    supportsType(type: AuthType): boolean;
    prepareRegistration(serverData: any, clientData: any): Promise<any>;
    prepareAuthentication(serverData: any, clientData: any): Promise<any>;
}

export class EmailAuthServer implements AuthServer {
    constructor(public messenger: Messenger) {}

    supportsType(type: AuthType) {
        return type === AuthType.Email;
    }

    async initAuthenticator(
        authenticator: Authenticator,
        account: Account,
        _auth: Auth,
        { email = account.email }: { email: string }
    ) {
        const activationCode = await this._generateCode();
        authenticator.state = {
            email: email,
            activationCode,
        };
        this.messenger.send(email, new EmailAuthMessage(activationCode));
        return {};
    }

    async activateAuthenticator(authenticator: Authenticator, { code: activationCode }: { code: string }) {
        if (activationCode !== authenticator.state.activationCode) {
            throw new Err(
                ErrorCode.AUTHENTICATION_FAILED,
                "Failed to activate authenticator. Incorrect activation code!"
            );
        }
        authenticator.description = authenticator.state.email;
        return {};
    }

    async initAuthRequest(authenticator: Authenticator, request: AuthRequest) {
        const verificationCode = await this._generateCode();
        request.state = {
            email: authenticator.state.email,
            verificationCode,
        };
        this.messenger.send(authenticator.state.email, new EmailAuthMessage(verificationCode));
        return {};
    }

    async verifyAuthRequest(
        _method: Authenticator,
        request: AuthRequest,
        { code: verificationCode }: { code: string }
    ) {
        return (
            !!request.state.verificationCode &&
            !!verificationCode &&
            request.state.verificationCode === verificationCode
        );
    }

    private async _generateCode(len = 6) {
        return (await randomNumber(0, Math.pow(10, len) - 1)).toString().padStart(len, "0");
    }
}

export class EmailAuthClient implements AuthClient {
    supportsType(type: AuthType) {
        return type === AuthType.Email;
    }

    async prepareRegistration(_serverData: undefined, clientData: { code: string }) {
        return clientData;
    }

    async prepareAuthentication(_serverData: undefined, clientData: { code: string }) {
        return clientData;
    }
}

export class TotpAuthConfig extends Config {
    @ConfigParam()
    interval = 30;

    @ConfigParam()
    digits = 6;

    @ConfigParam()
    hash: "SHA-1" | "SHA-256" = "SHA-1";

    @ConfigParam()
    window = 1;
}

export class TotpAuthServer implements AuthServer {
    constructor(private _config: TotpAuthConfig) {}

    supportsType(type: AuthType) {
        return type === AuthType.Totp;
    }

    async initAuthenticator(authenticator: Authenticator) {
        const secret = await generateSecret();
        authenticator.state = {
            secret,
        };
        authenticator.description = "TOTP";
        return { secret };
    }

    async activateAuthenticator(authenticator: Authenticator, { code }: { code: string }) {
        if (!(await this._verifyCode(authenticator, code))) {
            throw new Err(
                ErrorCode.AUTHENTICATION_FAILED,
                "Failed to activate authenticator. Incorrect activation code!"
            );
        }
        return {};
    }

    async initAuthRequest(_authenticator: Authenticator, _request: AuthRequest) {
        return {};
    }

    async verifyAuthRequest(authenticator: Authenticator, _request: AuthRequest, { code }: { code: string }) {
        return this._verifyCode(authenticator, code);
    }

    private async _verifyCode(authenticator: Authenticator, code: string) {
        const secret = base32ToBytes(authenticator.state.secret);
        const counter = getCounter(Date.now(), this._config);
        const lastCounter = authenticator.state.lastCounter || 0;
        if (counter <= lastCounter) {
            throw new Err(
                ErrorCode.AUTHENTICATION_FAILED,
                "Authentication request denied. Please wait for the next time window!"
            );
        }
        const verified = await validateHotp(secret, code, counter, this._config);
        authenticator.state.lastCounter = counter;
        return verified;
    }
}

export class TotpAuthCLient implements AuthClient {
    supportsType(type: AuthType) {
        return type === AuthType.Totp;
    }

    async prepareRegistration(_serverData: undefined, clientData: { code: string }) {
        return clientData;
    }

    async prepareAuthentication(_serverData: undefined, clientData: { code: string }) {
        return clientData;
    }
}

export class PublicKeyAuthChallenge extends Serializable {
    @AsBytes()
    value!: Uint8Array;

    @AsSerializable(RSASigningParams)
    signingParams = new RSASigningParams();

    async init() {
        this.value = await getCryptoProvider().randomBytes(16);
    }
}

export class PublicKeyAuthClientData extends SimpleContainer implements Storable {
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

export class PublicKeyAuthClient implements AuthClient {
    constructor(private _keyStore: BiometricKeyStore) {}

    supportsType(type: AuthType) {
        return type === AuthType.PublicKey;
    }

    async prepareRegistration({ challenge: rawChallenge }: { challenge: any }) {
        const challenge = new PublicKeyAuthChallenge().fromRaw(rawChallenge);
        const data = new PublicKeyAuthClientData();
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
        const challenge = new PublicKeyAuthChallenge().fromRaw(rawChallenge);
        const data = await getStorage().get(PublicKeyAuthClientData, "");
        const key = await this._keyStore.getKey("");
        await data.unlock(key);
        const signedChallenge = await this._sign(data, challenge);
        return {
            signedChallenge: bytesToBase64(signedChallenge),
        };
    }

    private _sign(data: PublicKeyAuthClientData, challenge: PublicKeyAuthChallenge): Promise<Uint8Array> {
        if (!data.privateKey) {
            throw "No private key provided";
        }

        return getCryptoProvider().sign(data.privateKey, challenge.value, challenge.signingParams);
    }
}

export class PublicKeyAuthServer implements AuthServer {
    supportsType(type: AuthType) {
        return type === AuthType.PublicKey;
    }

    async initAuthenticator(authenticator: Authenticator) {
        const challenge = new PublicKeyAuthChallenge();
        await challenge.init();
        authenticator.state = {
            activationChallenge: challenge.toRaw(),
        };
        authenticator.description = authenticator.device?.description || "Unknown Device Platform Authenticator";
        return {
            challenge: challenge.toRaw(),
        };
    }

    async activateAuthenticator(
        authenticator: Authenticator<any>,
        { publicKey, signedChallenge }: { publicKey: string; signedChallenge: string }
    ): Promise<any> {
        const challenge = new PublicKeyAuthChallenge().fromRaw(authenticator.state.activationChallenge);
        if (!(await this._verify(base64ToBytes(publicKey), challenge, base64ToBytes(signedChallenge)))) {
            throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Failed to activate authenticator. Invalid signature!");
        }
        authenticator.state = { publicKey };
        return {};
    }

    async initAuthRequest(_authenticator: Authenticator<any>, request: AuthRequest<any>): Promise<any> {
        const challenge = new PublicKeyAuthChallenge();
        await challenge.init();
        request.state = { challenge: challenge.toRaw() };
        return {
            challenge: challenge.toRaw(),
        };
    }

    async verifyAuthRequest(
        authenticator: Authenticator<any>,
        request: AuthRequest<any>,
        { signedChallenge: rawSignedChallenge }: { signedChallenge: string }
    ): Promise<boolean> {
        const publicKey = base64ToBytes(authenticator.state.publicKey);
        const challenge = new PublicKeyAuthChallenge().fromRaw(request.state.challenge);
        const signedChallenge = base64ToBytes(rawSignedChallenge);
        return this._verify(publicKey, challenge, signedChallenge);
    }

    private async _verify(
        publicKey: Uint8Array,
        challenge: PublicKeyAuthChallenge,
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
