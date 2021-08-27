import { MFAuthenticator, MFAServer, MFARequest, MFAType } from "@padloc/core/src/mfa";
import { Account } from "@padloc/core/src/account";
import {
    generateAttestationOptions,
    verifyAttestationResponse,
    generateAssertionOptions,
    verifyAssertionResponse,
} from "@simplewebauthn/server";
import {
    PublicKeyCredentialCreationOptionsJSON,
    AttestationCredentialJSON,
    PublicKeyCredentialRequestOptionsJSON,
    AssertionCredentialJSON,
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

interface WebAuthnAttestationInfo {
    credentialPublicKey: string;
    credentialID: string;
    counter: number;
}

interface WebAuthnAuthenticatorData {
    attestationOptions?: PublicKeyCredentialCreationOptionsJSON;
    attestationInfo?: WebAuthnAttestationInfo;
}

interface WebAuthnRequestData {
    assertionOptions?: PublicKeyCredentialRequestOptionsJSON;
}

export class WebAuthnServer implements MFAServer {
    constructor(public config: WebAuthnSettings) {}

    async init() {
        // await this._metadataService.initialize({
        //     mdsServers: [
        //         {
        //             url: "https://mds.fidoalliance.org/",
        //             rootCertURL: "https://valid.r3.roots.globalsign.com/",
        //             metadataURLSuffix: "",
        //         },
        //     ],
        // });
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

        const attestationOptions = generateAttestationOptions({
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
                        auth.data.attestationInfo
                )
                .map((a: MFAuthenticator<WebAuthnAuthenticatorData>) => ({
                    id: base64ToBytes(a.data!.attestationInfo!.credentialID),
                    type: "public-key",
                })),
        });

        authenticator.data = {
            attestationOptions,
        };

        return attestationOptions;
    }

    async activateMFAuthenticator(
        authenticator: MFAuthenticator<WebAuthnAuthenticatorData>,
        credential: AttestationCredentialJSON
    ) {
        if (!authenticator.data?.attestationOptions) {
            throw new Err(ErrorCode.MFA_FAILED, "Failed to activate authenticator. No attestation options provided.");
        }
        const { verified, attestationInfo } = await verifyAttestationResponse({
            expectedChallenge: authenticator.data.attestationOptions.challenge,
            expectedOrigin: this.config.origin,
            expectedRPID: this.config.rpID,
            credential,
        });
        if (!verified) {
            throw new Err(
                ErrorCode.MFA_FAILED,
                "Failed to activate authenticator. Failed to verify attestation options."
            );
        }

        const { credentialID, credentialPublicKey, counter } = attestationInfo!;
        authenticator.data.attestationInfo = {
            credentialID: bytesToBase64(credentialID),
            credentialPublicKey: bytesToBase64(credentialPublicKey),
            counter,
        };

        authenticator.description = await this._getDescription(authenticator);
    }

    async initMFARequest(
        authenticator: MFAuthenticator<WebAuthnAuthenticatorData>,
        request: MFARequest<WebAuthnRequestData>
    ) {
        if (!authenticator.data?.attestationInfo) {
            throw new Err(ErrorCode.MFA_FAILED, "Failed to activate authenticator.");
        }

        const options = generateAssertionOptions({
            allowCredentials: [
                { type: "public-key", id: base64ToBytes(authenticator.data.attestationInfo.credentialID) },
            ],
            userVerification: "preferred",
        });

        request.data = {
            assertionOptions: options,
        };

        return options;
    }

    async verifyMFARequest(
        authenticator: MFAuthenticator<WebAuthnAuthenticatorData>,
        request: MFARequest<WebAuthnRequestData>,
        credential: AssertionCredentialJSON
    ) {
        if (!authenticator.data?.attestationInfo || !request.data?.assertionOptions) {
            throw new Err(ErrorCode.MFA_FAILED, "Failed to complete MFA request.");
        }

        try {
            const { credentialPublicKey, credentialID, ...rest } = authenticator.data.attestationInfo;
            const { verified, assertionInfo } = verifyAssertionResponse({
                expectedChallenge: request.data.assertionOptions.challenge,
                expectedOrigin: this.config.origin,
                expectedRPID: this.config.rpID,
                credential,
                authenticator: {
                    credentialID: Buffer.from(base64ToBytes(credentialID)),
                    credentialPublicKey: Buffer.from(base64ToBytes(credentialPublicKey)),
                    ...rest,
                },
            });

            authenticator.data.attestationInfo.counter = assertionInfo!.newCounter;

            return verified;
        } catch (e) {
            throw e;
        }
    }

    private async _getDescription(_authenticator: MFAuthenticator) {
        return "Unknown Authenticator";
        // let description = "Unknown Authenticator";
        // try {
        //     const metaData =
        //         attestationInfo?.aaguid && (await this._metadataService.getStatement(attestationInfo.aaguid));
        //     console.log(attestationInfo, metaData);
        //     if (metaData) {
        //         description = metaData.description;
        //     }
        // } catch (e) {
        //     console.error(e);
        // }
    }
}
