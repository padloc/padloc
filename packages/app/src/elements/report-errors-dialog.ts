import { translate as $l } from "@padloc/locale/src/translate";
import { app } from "../globals";
import { element, html, css } from "./base";
import { Dialog } from "./dialog";
import { composeEmail } from "@padloc/core/src/platform";

@element("pl-report-errors-dialog")
export class ReportErrorsDialog extends Dialog<void, void> {
    private _reportErrors() {
        const email = process.env.PL_SUPPORT_EMAIL || "";
        const subject = "Padloc Error Report";
        const message = `

----- enter your comment above -----

IMPORTANT: Please verify that the message below does not contain any sensitive data before sending this email!

The following errors occurred:

${app.state._errors.join("\n\n")}

Device Info:

${JSON.stringify(app.state.device.toRaw(), null, 4)}
`;
        composeEmail(email, subject, message);
        this._dismissErrors();
    }

    private _dismissErrors() {
        app.setState({ _errors: [] });
        this.done();
    }

    static styles = [
        ...Dialog.styles,
        css`
            .message {
                margin: 18px;
            }
        `
    ];

    renderContent() {
        return html`
            <header>
                <div class="title flex">
                    ${$l("Report Errors")}
                </div>
            </header>

            <div class="content">
                <div class="error note item">${$l("{0} Errors Detected", app.state._errors.length.toString())}</div>
                <div class="message">
                    ${$l(
                        "Padloc has registered {0} errors during your use of the app. " +
                            "These errors may not have any impact on functionality and can often be ignored, " +
                            "but reporting them may help us diagnose problems, identify possible failure " +
                            "modes and generally improve the stability of the app.",
                        app.state._errors.length.toString()
                    )}
                </div>
                <div class="actions">
                    <button class="primary tap" @click=${this._reportErrors}>Report</button>
                    <button class="tap" @click=${this._dismissErrors}>Dismiss</button>
                </div>
            </div>
        `;
    }
}
