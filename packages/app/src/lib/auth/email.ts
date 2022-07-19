import { AuthClient, AuthType } from "@padloc/core/src/auth";
import { getDialog } from "../dialog";
import { translate as $l } from "@padloc/locale/src/translate";
import { html } from "lit";
import "../../elements/prompt-dialog";
import { PromptDialog } from "../../elements/prompt-dialog";
import { formatDateFromNow } from "../util";

export class EmailAuthClient implements AuthClient {
    supportsType(type: AuthType) {
        return type === AuthType.Email;
    }

    private _updateDialogInterval?: number;

    async _promptCode({ email, sentAt, subject }: { email: string; sentAt: string; subject: string }) {
        const promptDialog = (await getDialog("pl-prompt-dialog")) as PromptDialog;

        const sent = new Date(sentAt);
        const message = async () => {
            const sentString = await formatDateFromNow(sent);
            return html` <div class="break-words">
                    ${$l(`Please enter the six digit verification code sent to {0}!`, email)}
                </div>
                <div class="tiny subtle top-margined">
                    <span class="semibold">Sent:</span> ${sentString}<br />
                    <span class="semibold">Subject:</span> ${subject}
                </div>`;
        };

        window.clearInterval(this._updateDialogInterval);
        this._updateDialogInterval = window.setInterval(async () => (promptDialog.message = await message()), 1000);

        const code = await promptDialog.show({
            title: $l("Email Authentication"),
            placeholder: $l("Enter Verification Code"),
            confirmLabel: $l("Submit"),
            type: "number",
            pattern: "[0-9]*",
            message: await message(),
            validate: async (val) => {
                if (!val || val.length !== 6) {
                    throw $l("Please enter the 6-digit verification code!");
                }

                return val;
            },
        });
        window.clearInterval(this._updateDialogInterval);

        return code ? { code } : null;
    }

    async prepareRegistration(params: { email: string; sentAt: string; subject: string }) {
        return this._promptCode(params);
    }

    async prepareAuthentication(params: { email: string; sentAt: string; subject: string }) {
        return this._promptCode(params);
    }
}
