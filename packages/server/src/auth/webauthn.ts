import { Authenticator, AuthServer, AuthRequest, AuthType, AuthPurpose } from "@padloc/core/src/auth";
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
    MetadataService,
} from "@simplewebauthn/server";
import {
    PublicKeyCredentialCreationOptionsJSON,
    RegistrationResponseJSON,
    PublicKeyCredentialRequestOptionsJSON,
    AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { base64ToBytes, bytesToBase64 } from "@padloc/core/src/encoding";
import { Auth } from "@padloc/core/src/auth";
import { Config, ConfigParam } from "@padloc/core/src/config";

export class WebAuthnConfig extends Config {
    constructor(init: Partial<WebAuthnConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam()
    rpName!: string;

    @ConfigParam()
    rpID!: string;

    // Legacy single-origin setting, used only when origins is empty.
    @ConfigParam()
    origin!: string;

    // Exact trusted web and extension origins.
    @ConfigParam("string[]")
    origins: string[] = [];

    get allowedOrigins(): string[] {
        return this.origins.length ? this.origins : this.origin ? [this.origin] : [];
    }
}

interface WebAuthnRegistrationInfo {
    credentialPublicKey: string;
    credentialID: string;
    counter: number;
    aaguid: string;
    transports?: string[];
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

        // Local unlock enrollments are independent credentials. Reusing the
        // account handle can replace an existing synced passkey in another
        // browser/provider, leaving its device enrollment pointing at a lost key.
        const userHandle = authenticator.purposes.includes(AuthPurpose.AccessKeyStore)
            ? authenticator.id
            : auth.account;
        if (!userHandle) throw new Err(ErrorCode.BAD_REQUEST, "Missing authenticator user handle.");

        const registrationOptions = await generateRegistrationOptions({
            ...this.config,
            userID: new TextEncoder().encode(userHandle),
            userName: auth.email,
            // userDisplayName: account.name,
            attestationType: "none",
            supportedAlgorithmIDs: [-7, -257, -8],
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

        // The v5 browser client encodes user.id as UTF-8 rather than decoding
        // the base64url user ID returned by newer server versions.
        registrationOptions.user.id = userHandle;

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
            expectedOrigin: this.config.allowedOrigins,
            expectedRPID: this.config.rpID,
            response: credential,
            requireUserVerification: authenticator.type === AuthType.WebAuthnPlatform,
        });
        if (!verified) {
            throw new Err(
                ErrorCode.AUTHENTICATION_FAILED,
                "Failed to activate authenticator. Failed to verify Registration options."
            );
        }

        const { credential: registeredCredential, aaguid } = registrationInfo!;
        authenticator.state.registrationInfo = {
            credentialID: registeredCredential.id,
            credentialPublicKey: bytesToBase64(registeredCredential.publicKey),
            counter: registeredCredential.counter,
            aaguid,
            // The v5 browser client sends transports at the top level, whereas
            // newer clients put them in response.transports.
            transports:
                registeredCredential.transports ??
                (credential as RegistrationResponseJSON & { transports?: string[] }).transports,
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

        const { credentialID, transports } = authenticator.state.registrationInfo;
        const platform = authenticator.type === AuthType.WebAuthnPlatform;
        const options = await generateAuthenticationOptions({
            rpID: this.config.rpID,
            allowCredentials: [
                {
                    id: bytesToBase64(base64ToBytes(credentialID)),
                    transports: transports?.length ? transports : platform ? ["internal"] : undefined,
                },
            ],
            userVerification: authenticator.type === AuthType.WebAuthnPlatform ? "required" : "preferred",
        });

        // A UI preference, not a substitute for credential ID/signature/UV checks.
        if (platform) options.hints = ["client-device"];
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

        const { credentialPublicKey, credentialID, ...rest } = authenticator.state.registrationInfo;
        const { verified, authenticationInfo } = await verifyAuthenticationResponse({
            expectedChallenge: request.state.authenticationOptions.challenge,
            expectedOrigin: this.config.allowedOrigins,
            expectedRPID: this.config.rpID,
            response: credential,
            requireUserVerification: authenticator.type === AuthType.WebAuthnPlatform,
            credential: {
                id: bytesToBase64(base64ToBytes(credentialID)),
                publicKey: base64ToBytes(credentialPublicKey),
                ...rest,
            },
        });

        if (!verified || !authenticationInfo) {
            throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Failed to complete authentication request.");
        }
        authenticator.state.registrationInfo.counter = authenticationInfo.newCounter;
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
