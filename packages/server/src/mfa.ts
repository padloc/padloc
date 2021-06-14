import { MFAuthenticator, MFAProvider, MFARequest, MFAType } from "@padloc/core/src/mfa";
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

interface WebAuthnMethodData {
    attestationOptions?: PublicKeyCredentialCreationOptionsJSON;
    attestationInfo?: WebAuthnAttestationInfo;
}

interface WebAuthnRequestData {
    assertionOptions?: PublicKeyCredentialRequestOptionsJSON;
}

export class WebAuthnMFAProvider implements MFAProvider {
    constructor(public settings: WebAuthnSettings) {}

    supportsType(type: MFAType) {
        return type === MFAType.WebAuthn;
    }

    async initMFAMethod(account: Account, method: MFAuthenticator) {
        const attestationOptions = generateAttestationOptions({
            ...this.settings,
            userID: account.id,
            userName: account.email,
            userDisplayName: account.name,
        });

        method.data = {
            attestationOptions,
        };

        return attestationOptions;
    }

    async activateMFAMethod(method: MFAuthenticator<WebAuthnMethodData>, credential: AttestationCredentialJSON) {
        if (!method.data?.attestationOptions) {
            throw new Err(ErrorCode.MFA_FAILED, "Failed to activate MFA method.");
        }
        const { verified, attestationInfo } = await verifyAttestationResponse({
            expectedChallenge: method.data.attestationOptions.challenge,
            expectedOrigin: this.settings.origin,
            expectedRPID: this.settings.rpID,
            credential,
        });
        if (!verified) {
            throw new Err(ErrorCode.MFA_FAILED, "Failed to activate MFA method.");
        }
        const { credentialID, credentialPublicKey, counter } = attestationInfo!;
        method.data.attestationInfo = {
            credentialID: bytesToBase64(credentialID),
            credentialPublicKey: bytesToBase64(credentialPublicKey),
            counter,
        };
    }

    async initMFARequest(method: MFAuthenticator<WebAuthnMethodData>, request: MFARequest<WebAuthnRequestData>) {
        if (!method.data?.attestationInfo) {
            throw new Err(ErrorCode.MFA_FAILED, "Failed to activate MFA method.");
        }

        const options = generateAssertionOptions({
            allowCredentials: [{ type: "public-key", id: base64ToBytes(method.data.attestationInfo.credentialID) }],
        });

        request.data = {
            assertionOptions: options,
        };

        return options;
    }

    async verifyMFARequest(
        method: MFAuthenticator<WebAuthnMethodData>,
        request: MFARequest<WebAuthnRequestData>,
        credential: AssertionCredentialJSON
    ) {
        if (!method.data?.attestationInfo || !request.data?.assertionOptions) {
            throw new Err(ErrorCode.MFA_FAILED, "Failed to complete MFA request.");
        }

        try {
            const { credentialPublicKey, credentialID, ...rest } = method.data.attestationInfo;
            const { verified, assertionInfo } = verifyAssertionResponse({
                expectedChallenge: request.data.assertionOptions.challenge,
                expectedOrigin: this.settings.origin,
                expectedRPID: this.settings.rpID,
                credential,
                authenticator: {
                    credentialID: Buffer.from(base64ToBytes(credentialID)),
                    credentialPublicKey: Buffer.from(base64ToBytes(credentialPublicKey)),
                    ...rest,
                },
            });

            method.data.attestationInfo.counter = assertionInfo!.newCounter;

            return verified;
        } catch (e) {
            console.error("mfa request failed", e);
            throw e;
        }
    }
}
