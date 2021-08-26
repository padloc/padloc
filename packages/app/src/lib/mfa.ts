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
import { generateURL } from "@padloc/core/src/otp";
import { html } from "lit";
import "../elements/qr-code";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { DeviceInfo } from "@padloc/core/src/platform";

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
                title: $l("Add MFA-Method"),
                placeholder: $l("Enter Verification Code"),
                confirmLabel: $l("Submit"),
                type: "number",
                pattern: "[0-9]*",
            });
            return code ? { code } : null;
        case MFAType.Totp:
            const secret = data.secret as string;
            const url = await generateURL({
                secret,
                account: app.account?.email || "",
            });
            const code2 = await prompt(
                html`
                    <div class="bottom-margined">
                        ${$l(
                            "Please scan the following qr-code in your authenticator app, then enter the displayed code to confirm!"
                        )}
                    </div>
                    <div class="centering vertical layout">
                        <pl-qr-code .value=${url} class="huge"></pl-qr-code>
                        <div class="tiny subtle top-margined"><strong>Secret:</strong> ${secret}</div>
                    </div>
                `,
                {
                    title: $l("Add MFA-Method"),
                    placeholder: $l("Enter Verification Code"),
                    confirmLabel: $l("Submit"),
                    type: "number",
                    pattern: "[0-9]*",
                }
            );
            return code2 ? { code: code2 } : null;
    }
}

export async function registerAuthenticator({
    purposes,
    type,
    data,
    device,
}: {
    purposes: MFAPurpose[];
    type: MFAType;
    data?: any;
    device?: DeviceInfo;
}) {
    const res = await app.api.startRegisterMFAuthenticator(
        new StartRegisterMFAuthenticatorParams({ purposes, type, data, device })
    );
    try {
        const prepData = await prepareRegisterAuthenticator(res);
        if (!prepData) {
            throw new Err(ErrorCode.MFA_FAILED, $l("Setup Canceled"));
        }
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
                title: $l("Email Authentication"),
                placeholder: $l("Enter Verification Code"),
                confirmLabel: $l("Submit"),
                type: "number",
                pattern: "[0-9]*",
            });
            return code ? { code } : null;
        case MFAType.Totp:
            const code2 = await prompt($l("Please enter the code displayed in your authenticator app to proceed!"), {
                title: $l("TOTP Authentication"),
                placeholder: $l("Enter Verification Code"),
                confirmLabel: $l("Submit"),
                type: "number",
                pattern: "[0-9]*",
            });
            return code2 ? { code: code2 } : null;
    }
}

export async function getMFAToken({
    purpose,
    type,
    email = app.account?.email,
    authenticatorId,
    authenticatorIndex,
}: {
    purpose: MFAPurpose;
    type?: MFAType;
    email?: string;
    authenticatorId?: string;
    authenticatorIndex?: number;
}) {
    const res = await app.api.startMFARequest(
        new StartMFARequestParams({ email, type, purpose, authenticatorId, authenticatorIndex })
    );

    const data = await prepareCompleteMFARequest(res);

    if (!data) {
        throw new Err(ErrorCode.MFA_FAILED, $l("Request was canceled."));
    }

    await app.api.completeMFARequest(new CompleteMFARequestParams({ id: res.id, data, email }));

    return res.token;
}
