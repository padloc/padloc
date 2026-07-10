import type { Auth } from "@padloc/core/src/auth";
import { type Authenticator, type AuthRequest, type AuthServer, AuthType } from "@padloc/core/src/auth";
import { Config, ConfigParam } from "@padloc/core/src/config";
import { base64ToBytes, bytesToBase64 } from "@padloc/core/src/encoding";
import { Err, ErrorCode } from "@padloc/core/src/error";
import type {
    AuthenticationResponseJSON,
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
    RegistrationResponseJSON,
} from "@simplewebauthn/server";
import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    MetadataService,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";

export class WebAuthnConfig extends Config {
    constructor(init: Partial<WebAuthnConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam()
    rpName!: string;

    @ConfigParam()
    rpID!: string;

    @ConfigParam()
    origin!: string;
}

interface WebAuthnRegistrationInfo {
    credentialPublicKey: string;
    credentialID: string;
    counter: number;
    aaguid: string;
}

interface WebAuthnAuthenticatorData {
    registrationOptions?: PublicKeyCredentialCreationOptionsJSON;
    registrationInfo?: WebAuthnRegistrationInfo;
}

interface WebAuthnRequestData {
    authenticationOptions?: PublicKeyCredentialRequestOptionsJSON;
}

export class WebAuthnServer implements AuthServer {
    constructor(public config: WebAuthnConfig) {}

    async init() {
        // await MetadataService.initialize();
    }

    supportsType(type: AuthType) {
        return [AuthType.WebAuthnPlatform, AuthType.WebAuthnPortable].includes(type);
    }

    async initAuthenticator(authenticator: Authenticator, auth: Auth) {
        if (!auth.account) {
            throw new Err(
                ErrorCode.AUTHENTICATION_FAILED,
                "This authentication type can only be initialized for active accounts."
            );
        }

        const authenticatorSelection: AuthenticatorSelectionCriteria =
            authenticator.type === AuthType.WebAuthnPlatform
                ? {
                      authenticatorAttachment: "platform",
                      userVerification: "required",
                  }
                : { authenticatorAttachment: "cross-platform" };

        const registrationOptions = await generateRegistrationOptions({
            rpName: this.config.rpName,
            rpID: this.config.rpID,
            userID: isoUint8Array.fromUTF8String(auth.account),
            userName: auth.email,
            attestationType: "none",
            authenticatorSelection,
        });

        authenticator.state = {
            registrationOptions,
        };

        return registrationOptions;
    }

    async activateAuthenticator(
        authenticator: Authenticator<WebAuthnAuthenticatorData>,
        credential: RegistrationResponseJSON
    ) {
        if (!authenticator.state?.registrationOptions) {
            throw new Err(
                ErrorCode.AUTHENTICATION_FAILED,
                "Failed to activate authenticator. No registration options provided."
            );
        }
        const { verified, registrationInfo } = await verifyRegistrationResponse({
            expectedChallenge: authenticator.state.registrationOptions.challenge,
            expectedOrigin: this.config.origin,
            expectedRPID: this.config.rpID,
            response: credential,
            requireUserVerification: authenticator.type === AuthType.WebAuthnPlatform,
        });
        if (!verified || !registrationInfo) {
            throw new Err(
                ErrorCode.AUTHENTICATION_FAILED,
                "Failed to activate authenticator. Failed to verify Registration options."
            );
        }

        const { credential: regCredential, aaguid } = registrationInfo;
        authenticator.state.registrationInfo = {
            credentialID: regCredential.id,
            credentialPublicKey: bytesToBase64(regCredential.publicKey),
            counter: regCredential.counter,
            aaguid,
        };

        authenticator.description = await this._getDescription(authenticator);
    }

    async initAuthRequest(
        authenticator: Authenticator<WebAuthnAuthenticatorData>,
        request: AuthRequest<WebAuthnRequestData>
    ) {
        if (!authenticator.state?.registrationInfo) {
            throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Authenticator not fully registered.");
        }

        const options = await generateAuthenticationOptions({
            rpID: this.config.rpID,
            allowCredentials: [{ id: authenticator.state.registrationInfo.credentialID }],
            userVerification: "preferred",
        });

        request.state = {
            authenticationOptions: options,
        };

        return options;
    }

    async verifyAuthRequest(
        authenticator: Authenticator<WebAuthnAuthenticatorData>,
        request: AuthRequest<WebAuthnRequestData>,
        credential: AuthenticationResponseJSON
    ) {
        if (!authenticator.state?.registrationInfo || !request.state?.authenticationOptions) {
            throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Failed to complete authentication request.");
        }

        const { credentialPublicKey, credentialID, counter } = authenticator.state.registrationInfo;
        const { verified, authenticationInfo } = await verifyAuthenticationResponse({
            expectedChallenge: request.state.authenticationOptions.challenge,
            expectedOrigin: this.config.origin,
            expectedRPID: this.config.rpID,
            response: credential,
            credential: {
                id: credentialID,
                publicKey: new Uint8Array(base64ToBytes(credentialPublicKey)),
                counter,
            },
            requireUserVerification: false,
        });

        authenticator.state.registrationInfo.counter = authenticationInfo.newCounter;

        if (!verified) {
            throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Failed to complete authentication request.");
        }
    }

    private async _getDescription({ state: { registrationInfo } }: Authenticator) {
        let description = "Unknown Authenticator";
        try {
            const metaData = registrationInfo?.aaguid && (await MetadataService.getStatement(registrationInfo.aaguid));
            if (metaData) {
                description = metaData.description;
            }
        } catch (e) {}
        return description;
    }
}
