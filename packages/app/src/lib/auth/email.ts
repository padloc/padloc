import { AuthClient, AuthType } from "@padloc/core/src/auth";
import { prompt } from "../dialog";
import { translate as $l } from "@padloc/locale/src/translate";

export class EmailAuthClient implements AuthClient {
    supportsType(type: AuthType) {
        return type === AuthType.Email;
    }

    async prepareRegistration({ email }: { email: string }) {
        const code = await prompt($l(`Please enter the confirmation code sent to {0} to proceed!`, email), {
            title: $l("Add MFA-Method"),
            placeholder: $l("Enter Verification Code"),
            confirmLabel: $l("Submit"),
            type: "number",
            pattern: "[0-9]*",
        });
        return code ? { code } : null;
    }

    async prepareAuthentication({ email }: { email: string }) {
        const code = await prompt($l(`Please enter the confirmation code sent to {0} to proceed!`, email), {
            title: $l("Email Authentication"),
            placeholder: $l("Enter Verification Code"),
            confirmLabel: $l("Submit"),
            type: "number",
            pattern: "[0-9]*",
        });
        return code ? { code } : null;
    }
}
