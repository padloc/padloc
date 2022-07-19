import { AuthClient, AuthType, AuthServer, Authenticator, AuthRequest } from "../auth";
import { SimpleContainer } from "../container";
import { RSASigningParams, RSAPublicKey, RSAPrivateKey, RSAKeyParams, AESKeyParams } from "../crypto";
import { Serializable, AsBytes, AsSerializable, Exclude, bytesToBase64, base64ToBytes } from "../encoding";
import { Err, ErrorCode } from "../error";
import { getCryptoProvider, BiometricKeyStore, getStorage } from "../platform";
import { Storable } from "../storage";

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
    ): Promise<void> {
        const publicKey = base64ToBytes(authenticator.state.publicKey);
        const challenge = new PublicKeyAuthChallenge().fromRaw(request.state.challenge);
        const signedChallenge = base64ToBytes(rawSignedChallenge);
        const verified = await this._verify(publicKey, challenge, signedChallenge);

        if (!verified) {
            throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Invalid signature.");
        }
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
