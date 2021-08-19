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
import { MetadataService } from "@simplewebauthn/server/dist/metadata/metadataService";

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

export class WebAuthnServer implements MFAServer {
    private _metadataService = new MetadataService();

    constructor(public config: WebAuthnSettings) {}

    async init() {
        await this._metadataService.initialize({
            mdsServers: [
                {
                    url: "https://mds.fidoalliance.org/",
                    rootCertURL: "https://valid.r3.roots.globalsign.com/",
                    metadataURLSuffix: "",
                },
            ],
        });
    }

    supportsType(type: MFAType) {
        return type === MFAType.WebAuthn;
    }

    async initMFAuthenticator(
        account: Account,
        authenticator: MFAuthenticator,
        { authenticatorSelection }: { authenticatorSelection?: AuthenticatorSelectionCriteria } = {}
    ) {
        const attestationOptions = generateAttestationOptions({
            ...this.config,
            userID: account.id,
            userName: account.email,
            userDisplayName: account.name,
            attestationType: "direct",
            authenticatorSelection,
        });

        authenticator.data = {
            attestationOptions,
        };

        return attestationOptions;
    }

    async activateMFAuthenticator(
        authenticator: MFAuthenticator<WebAuthnMethodData>,
        credential: AttestationCredentialJSON
    ) {
        if (!authenticator.data?.attestationOptions) {
            throw new Err(ErrorCode.MFA_FAILED, "Failed to activate authenticator.");
        }
        const { verified, attestationInfo } = await verifyAttestationResponse({
            expectedChallenge: authenticator.data.attestationOptions.challenge,
            expectedOrigin: this.config.origin,
            expectedRPID: this.config.rpID,
            credential,
        });
        if (!verified) {
            throw new Err(ErrorCode.MFA_FAILED, "Failed to activate authenticator.");
        }

        const { credentialID, credentialPublicKey, counter } = attestationInfo!;
        authenticator.data.attestationInfo = {
            credentialID: bytesToBase64(credentialID),
            credentialPublicKey: bytesToBase64(credentialPublicKey),
            counter,
        };

        let description = "Unknown Authenticator";
        try {
            const metaData =
                attestationInfo?.aaguid && (await this._metadataService.getStatement(attestationInfo.aaguid));
            console.log(attestationInfo, metaData);
            if (metaData) {
                description = metaData.description;
            }
        } catch (e) {
            console.error(e);
        }
        authenticator.description = description;
    }

    async initMFARequest(authenticator: MFAuthenticator<WebAuthnMethodData>, request: MFARequest<WebAuthnRequestData>) {
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
        authenticator: MFAuthenticator<WebAuthnMethodData>,
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

    getDescription(_authenticator: MFAuthenticator) {
        return `Webauthn`;
    }
}
