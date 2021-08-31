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
    private _isWebAuthnSupported = false;
    private _isPlatformAuthenticatorAvailable = false;

    constructor() {
        (async () => {
            this._isWebAuthnSupported = await browserSupportsWebauthn();
            this._isPlatformAuthenticatorAvailable =
                this._isWebAuthnSupported && (await platformAuthenticatorIsAvailable());
        })();
    }

    supportsType(type: MFAType) {
        return (
            this._isWebAuthnSupported &&
            (type === MFAType.WebAuthnPortable ||
                (type === MFAType.WebAuthnPlatform && this._isPlatformAuthenticatorAvailable))
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
