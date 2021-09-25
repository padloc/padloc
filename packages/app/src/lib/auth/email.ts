import { AuthClient, AuthType } from "@padloc/core/src/auth";
import { prompt } from "../dialog";
import { translate as $l } from "@padloc/locale/src/translate";

export class EmailAuthClient implements AuthClient {
    supportsType(type: AuthType) {
        return type === AuthType.Email;
    }

    async prepareRegistration(_data: { email: string }) {
        const code = await prompt($l("Please enter the confirmation code sent to your email address to proceed!"), {
            title: $l("Add MFA-Method"),
            placeholder: $l("Enter Verification Code"),
            confirmLabel: $l("Submit"),
            type: "number",
            pattern: "[0-9]*",
        });
        return code ? { code } : null;
    }

    async prepareAuthentication(_data: { email: string }) {
        const code = await prompt($l("Please enter the confirmation code sent to your email address to proceed!"), {
            title: $l("Email Authentication"),
            placeholder: $l("Enter Verification Code"),
            confirmLabel: $l("Submit"),
            type: "number",
            pattern: "[0-9]*",
        });
        return code ? { code } : null;
    }
}
