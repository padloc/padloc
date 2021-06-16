import {
    CompleteMFARequestParams,
    CompleteRegisterMFAuthenticatorParams,
    StartMFARequestParams,
    StartRegisterMFAuthenticatorParams,
} from "@padloc/core/src/api";
import { MFAPurpose, MFAType } from "@padloc/core/src/mfa";
import { startAssertion, startAttestation, supportsWebauthn } from "@simplewebauthn/browser";
import {
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/typescript-types";
import { app } from "../globals";

export class WebAuthnClient {
    supportsType(type: MFAType) {
        return type === MFAType.WebAuthn;
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

const webAuthnClient = new WebAuthnClient();

export async function registerAuthenticator(purposes: MFAPurpose[], type: MFAType.WebAuthn = MFAType.WebAuthn) {
    const { id, data } = await app.api.startRegisterMFAuthenticator(
        new StartRegisterMFAuthenticatorParams({ purposes, type })
    );
    const att = await webAuthnClient.prepareAttestation(data, undefined);
    await app.api.completeRegisterMFAuthenticator(new CompleteRegisterMFAuthenticatorParams({ id, data: att }));
    return id;
}

export async function getMFAToken(
    purpose: MFAPurpose,
    type: MFAType = MFAType.WebAuthn,
    email = app.account?.email,
    authenticatorId?: string
) {
    const { id, data, token } = await app.api.startMFARequest(
        new StartMFARequestParams({ email, type, purpose, authenticatorId })
    );

    const ass = await webAuthnClient.prepareAssertion(data, undefined);

    await app.api.completeMFARequest(new CompleteMFARequestParams({ id, data: ass, email }));

    return token;
}
