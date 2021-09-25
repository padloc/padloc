import { AuthClient, AuthType } from "@padloc/core/src/auth";
import { generateURL } from "@padloc/core/src/otp";
import { html } from "lit-html";
import { app } from "../../globals";
import { prompt } from "../dialog";
import { $l } from "@padloc/locale/src/translate";

export class TotpAuthCLient implements AuthClient {
    supportsType(type: AuthType) {
        return type === AuthType.Totp;
    }

    async prepareRegistration(data: { secret: string }) {
        const secret = data.secret as string;
        const url = generateURL({
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

    async prepareAuthentication(_data: any) {
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
