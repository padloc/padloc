import {
    CompleteMFARequestParams,
    CompleteRegisterMFAuthenticatorParams,
    StartMFARequestParams,
    StartMFARequestResponse,
    StartRegisterMFAuthenticatorParams,
    StartRegisterMFAuthenticatorResponse,
} from "@padloc/core/src/api";
import { MFAPurpose, MFAType } from "@padloc/core/src/mfa";
import { startAssertion, startAttestation, supportsWebauthn } from "@simplewebauthn/browser";
import {
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/typescript-types";
import { app } from "../globals";
import { prompt } from "./dialog";
import { translate as $l } from "@padloc/locale/src/translate";

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

export async function prepareRegisterAuthenticator({ data, type }: StartRegisterMFAuthenticatorResponse) {
    switch (type) {
        case MFAType.WebAuthn:
            return webAuthnClient.prepareAttestation(data, undefined);
        case MFAType.Email:
            const code = await prompt($l("Please enter the confirmation code sent to your email address to proceed!"), {
                title: $l("One Last Step!"),
                placeholder: $l("Enter Verification Code"),
                confirmLabel: $l("Submit"),
                type: "number",
                pattern: "[0-9]*",
            });
            return { code };
    }
}

export async function registerAuthenticator(purposes: MFAPurpose[], type: MFAType, data?: any) {
    const res = await app.api.startRegisterMFAuthenticator(
        new StartRegisterMFAuthenticatorParams({ purposes, type, data })
    );
    try {
        const prepData = await prepareRegisterAuthenticator(res);
        await app.api.completeRegisterMFAuthenticator(
            new CompleteRegisterMFAuthenticatorParams({ id: res.id, data: prepData })
        );
        return res.id;
    } catch (e) {
        await app.api.deleteMFAuthenticator(res.id);
        throw e;
    }
}

export async function prepareCompleteMFARequest({ data, type }: StartMFARequestResponse) {
    switch (type) {
        case MFAType.WebAuthn:
            return webAuthnClient.prepareAssertion(data, undefined);
        case MFAType.Email:
            const code = await prompt($l("Please enter the confirmation code sent to your email address to proceed!"), {
                title: $l("One Last Step!"),
                placeholder: $l("Enter Verification Code"),
                confirmLabel: $l("Submit"),
                type: "number",
                pattern: "[0-9]*",
            });
            return { code };
    }
}

export async function getMFAToken(
    purpose: MFAPurpose,
    type?: MFAType,
    email = app.account?.email,
    authenticatorId?: string
) {
    const res = await app.api.startMFARequest(new StartMFARequestParams({ email, type, purpose, authenticatorId }));

    const data = await prepareCompleteMFARequest(res);

    await app.api.completeMFARequest(new CompleteMFARequestParams({ id: res.id, data, email }));

    return res.token;
}
