import { MFAuthenticator, MFAServer, MFARequest, MFAType } from "@padloc/core/src/mfa";
import { Account } from "@padloc/core/src/account";
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

interface WebAuthnSettings {
    rpName: string;
    rpID: string;
    attestationType: "indirect" | "direct" | "none";
    origin: string;
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

export class WebAuthnServer implements MFAServer {
    constructor(public config: WebAuthnSettings) {}

    async init() {
        await MetadataService.initialize();
    }

    supportsType(type: MFAType) {
        return [MFAType.WebAuthnPlatform, MFAType.WebAuthnPortable].includes(type);
    }

    async initMFAuthenticator(authenticator: MFAuthenticator, account: Account, auth: Auth) {
        const authenticatorSelection: AuthenticatorSelectionCriteria =
            authenticator.type === MFAType.WebAuthnPlatform
                ? {
                      authenticatorAttachment: "platform",
                      userVerification: "required",
                  }
                : { authenticatorAttachment: "cross-platform" };

        const registrationOptions = generateRegistrationOptions({
            ...this.config,
            userID: account.id,
            userName: account.email,
            userDisplayName: account.name,
            attestationType: "direct",
            authenticatorSelection,
            excludeCredentials: auth.mfAuthenticators
                .filter(
                    (auth) =>
                        [MFAType.WebAuthnPlatform, MFAType.WebAuthnPortable].includes(auth.type) &&
                        !!auth.data &&
                        auth.data.registrationInfo
                )
                .map((a: MFAuthenticator<WebAuthnAuthenticatorData>) => ({
                    id: base64ToBytes(a.data!.registrationInfo!.credentialID),
                    type: "public-key",
                })),
        });

        authenticator.data = {
            registrationOptions,
        };

        return registrationOptions;
    }

    async activateMFAuthenticator(
        authenticator: MFAuthenticator<WebAuthnAuthenticatorData>,
        credential: RegistrationCredentialJSON
    ) {
        if (!authenticator.data?.registrationOptions) {
            throw new Err(ErrorCode.MFA_FAILED, "Failed to activate authenticator. No registration options provided.");
        }
        const { verified, registrationInfo } = await verifyRegistrationResponse({
            expectedChallenge: authenticator.data.registrationOptions.challenge,
            expectedOrigin: this.config.origin,
            expectedRPID: this.config.rpID,
            credential,
        });
        if (!verified) {
            throw new Err(
                ErrorCode.MFA_FAILED,
                "Failed to activate authenticator. Failed to verify Registration options."
            );
        }

        const { credentialID, credentialPublicKey, counter, aaguid } = registrationInfo!;
        authenticator.data.registrationInfo = {
            credentialID: bytesToBase64(credentialID),
            credentialPublicKey: bytesToBase64(credentialPublicKey),
            counter,
            aaguid,
        };

        authenticator.description = await this._getDescription(authenticator);
    }

    async initMFARequest(
        authenticator: MFAuthenticator<WebAuthnAuthenticatorData>,
        request: MFARequest<WebAuthnRequestData>
    ) {
        if (!authenticator.data?.registrationInfo) {
            throw new Err(ErrorCode.MFA_FAILED, "Authenticator not fully registered.");
        }

        const options = generateAuthenticationOptions({
            allowCredentials: [
                { type: "public-key", id: base64ToBytes(authenticator.data.registrationInfo.credentialID) },
            ],
            userVerification: "preferred",
        });

        request.data = {
            authenticationOptions: options,
        };

        return options;
    }

    async verifyMFARequest(
        authenticator: MFAuthenticator<WebAuthnAuthenticatorData>,
        request: MFARequest<WebAuthnRequestData>,
        credential: AuthenticationCredentialJSON
    ) {
        if (!authenticator.data?.registrationInfo || !request.data?.authenticationOptions) {
            throw new Err(ErrorCode.MFA_FAILED, "Failed to complete MFA request.");
        }

        try {
            const { credentialPublicKey, credentialID, ...rest } = authenticator.data.registrationInfo;
            const { verified, authenticationInfo } = verifyAuthenticationResponse({
                expectedChallenge: request.data.authenticationOptions.challenge,
                expectedOrigin: this.config.origin,
                expectedRPID: this.config.rpID,
                credential,
                authenticator: {
                    credentialID: Buffer.from(base64ToBytes(credentialID)),
                    credentialPublicKey: Buffer.from(base64ToBytes(credentialPublicKey)),
                    ...rest,
                },
            });

            authenticator.data.registrationInfo.counter = authenticationInfo!.newCounter;

            return verified;
        } catch (e) {
            throw e;
        }
    }

    private async _getDescription({ data: { registrationInfo } }: MFAuthenticator) {
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
