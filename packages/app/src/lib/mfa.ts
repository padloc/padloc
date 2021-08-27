import { MFAType } from "@padloc/core/src/mfa";
import { startAssertion, startAttestation, supportsWebauthn } from "@simplewebauthn/browser";
import {
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/typescript-types";
import "../elements/qr-code";

export class WebAuthnClient {
    private _supportsPlatformAuthenticator = false;

    constructor() {
        (async () =>
            (this._supportsPlatformAuthenticator = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()))();
    }

    supportsType(type: MFAType) {
        return (
            type === MFAType.WebAuthnPortable ||
            (type === MFAType.WebAuthnPlatform && this._supportsPlatformAuthenticator)
        );
    }

    async prepareAttestation(serverData: PublicKeyCredentialCreationOptionsJSON, _clientData: undefined) {
        return startAttestation(serverData);
    }

    async prepareAssertion(serverData: PublicKeyCredentialRequestOptionsJSON, _clientData: undefined) {
        return startAssertion(serverData);
    }
}

export function isWebAuthnSupported() {
    return supportsWebauthn();
}

export const webAuthnClient = new WebAuthnClient();
