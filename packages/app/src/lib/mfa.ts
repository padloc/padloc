import { MFAClient, MFAType } from "@padloc/core/src/mfa";
import {
    startAuthentication,
    startRegistration,
    browserSupportsWebauthn,
    platformAuthenticatorIsAvailable,
} from "@simplewebauthn/browser";
import {
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/typescript-types";
import "../elements/qr-code";

export class WebAuthnClient implements MFAClient {
    private _supportsPlatformAuthenticator = false;

    constructor() {
        async () => (this._supportsPlatformAuthenticator = await platformAuthenticatorIsAvailable());
    }

    supportsType(type: MFAType) {
        return (
            type === MFAType.WebAuthnPortable ||
            (type === MFAType.WebAuthnPlatform && this._supportsPlatformAuthenticator)
        );
    }

    async prepareRegistration(serverData: PublicKeyCredentialCreationOptionsJSON, _clientData: undefined) {
        return startRegistration(serverData);
    }

    async prepareAuthentication(serverData: PublicKeyCredentialRequestOptionsJSON, _clientData: undefined) {
        return startAuthentication(serverData);
    }
}

export function isWebAuthnSupported() {
    return browserSupportsWebauthn();
}

export const webAuthnClient = new WebAuthnClient();
