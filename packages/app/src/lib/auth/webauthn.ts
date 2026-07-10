import { type AuthClient, AuthType } from "@padloc/core/src/auth";
import type {
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import {
    browserSupportsWebAuthn,
    platformAuthenticatorIsAvailable,
    startAuthentication,
    startRegistration,
} from "@simplewebauthn/browser";

export class WebAuthnClient implements AuthClient {
    readonly ready = this._init();

    private _isWebAuthnSupported = false;
    private _isPlatformAuthenticatorAvailable = false;

    private async _init() {
        this._isWebAuthnSupported = browserSupportsWebAuthn();
        this._isPlatformAuthenticatorAvailable =
            this._isWebAuthnSupported && (await platformAuthenticatorIsAvailable());
    }

    supportsType(type: AuthType) {
        return (
            this._isWebAuthnSupported &&
            (type === AuthType.WebAuthnPortable ||
                (type === AuthType.WebAuthnPlatform && this._isPlatformAuthenticatorAvailable))
        );
    }

    async prepareRegistration(serverData: PublicKeyCredentialCreationOptionsJSON) {
        return startRegistration({ optionsJSON: serverData });
    }

    async prepareAuthentication(serverData: PublicKeyCredentialRequestOptionsJSON) {
        return startAuthentication({ optionsJSON: serverData });
    }
}

export function isWebAuthnSupported() {
    return browserSupportsWebAuthn();
}

export const webAuthnClient = new WebAuthnClient();
