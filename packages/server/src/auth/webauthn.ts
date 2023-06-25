import { Authenticator, AuthServer, AuthRequest, AuthType } from "@padloc/core/src/auth";
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
    MetadataService,
} from "@simplewebauthn/server";
import {
    PublicKeyCredentialCreationOptionsJSON,
    RegistrationCredentialJSON,
    PublicKeyCredentialRequestOptionsJSON,
    AuthenticationCredentialJSON,
} from "@simplewebauthn/typescript-types";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { base64ToBytes, bytesToBase64 } from "@padloc/core/src/encoding";
import { Auth } from "@padloc/core/src/auth";
import { WebAuthnConfig } from "@padloc/core/src/config/auth/webauthn";
import { SimpleService } from "@padloc/core/src/service";

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

export class WebAuthnServer extends SimpleService implements AuthServer {
    constructor(public config: WebAuthnConfig) {
        super();
    }

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

        const registrationOptions = generateRegistrationOptions({
            ...this.config,
            userID: auth.account,
            userName: auth.email,
            // userDisplayName: account.name,
            attestationType: "indirect",
            authenticatorSelection,
            // excludeCredentials: auth.authenticators
            //     .filter(
            //         (auth) =>
            //             [AuthType.WebAuthnPlatform, AuthType.WebAuthnPortable].includes(auth.type) &&
            //             !!auth.state &&
            //             auth.state.registrationInfo
            //     )
            //     .map((a: Authenticator<WebAuthnAuthenticatorData>) => ({
            //         id: base64ToBytes(a.state!.registrationInfo!.credentialID),
            //         type: "public-key",
            //     })),
        });

        authenticator.state = {
            registrationOptions,
        };

        return registrationOptions;
    }

    async activateAuthenticator(
        authenticator: Authenticator<WebAuthnAuthenticatorData>,
        credential: RegistrationCredentialJSON
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
            credential,
        });
        if (!verified) {
            throw new Err(
                ErrorCode.AUTHENTICATION_FAILED,
                "Failed to activate authenticator. Failed to verify Registration options."
            );
        }

        const { credentialID, credentialPublicKey, counter, aaguid } = registrationInfo!;
        authenticator.state.registrationInfo = {
            credentialID: bytesToBase64(credentialID),
            credentialPublicKey: bytesToBase64(credentialPublicKey),
            counter,
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

        const options = generateAuthenticationOptions({
            allowCredentials: [
                { type: "public-key", id: base64ToBytes(authenticator.state.registrationInfo.credentialID) },
            ],
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
        credential: AuthenticationCredentialJSON
    ) {
        if (!authenticator.state?.registrationInfo || !request.state?.authenticationOptions) {
            throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Failed to complete authentication request.");
        }

        const { credentialPublicKey, credentialID, ...rest } = authenticator.state.registrationInfo;
        const { verified, authenticationInfo } = verifyAuthenticationResponse({
            expectedChallenge: request.state.authenticationOptions.challenge,
            expectedOrigin: this.config.origin,
            expectedRPID: this.config.rpID,
            credential,
            authenticator: {
                credentialID: Buffer.from(base64ToBytes(credentialID)),
                credentialPublicKey: Buffer.from(base64ToBytes(credentialPublicKey)),
                ...rest,
            },
        });

        authenticator.state.registrationInfo.counter = authenticationInfo!.newCounter;

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
