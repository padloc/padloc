import { localize as $l } from "@padlock/core/lib/locale.js";
import { passwordStrength } from "@padlock/core/lib/util.js";
import { setClipboard } from "@padlock/core/lib/platform.js";
import { toPadlock, toCSV } from "@padlock/core/lib/export.js";
import { Record } from "@padlock/core/lib/data.js";
import { shared, mixins } from "../styles";
import { confirm, alert, prompt } from "../dialog.js";
import { BaseElement, element, html, property } from "./base.js";
import "./icon.js";

const exportCSVWarning = $l(
    "WARNING: Exporting to CSV format will save your data without encyryption of any " +
        "kind which means it can be read by anyone. We strongly recommend exporting your data as " +
        "a secure, encrypted file, instead! Are you sure you want to proceed?"
);

@element("pl-export-dialog")
export class ExportDialog extends BaseElement {
    @property() open: boolean = false;
    @property() records: Record[] = [];

    private _resolve: (() => void) | null;

    render() {
        const { open, records } = this;
        return html`
        ${shared}

        <style include="shared">

            :host {
                display: block;
                --pl-dialog-inner: {
                    ${mixins.gradientHighlight()}
                };
            }

            .row {
                display: flex;
                align-items: center;
            }

            .label {
                padding: 0 15px;
                flex: 1;
            }

            .message {
                font-weight: bold;
            }

            pl-icon {
                width: 50px;
                height: 50px;
            }
        </style>

        <pl-dialog
            .open=${open}
            @dialog-dismiss=${() => this._done()}>

            <div class="message tiles-1">${$l("Export {0} Records", records.length.toString())}</div>

            <div class="tiles tiles-2 row">

                <div class="label">${$l("As CSV")}</div>

                <pl-icon icon="copy" class="tap" @click=${() => this._copyCSV()}></pl-icon>

                <pl-icon
                    icon="download"
                    class="tap" @click=${() => this._downloadCSV()}>
                </pl-icon>

            </div>

            <div class="tiles tiles-3 row">

                <div class="label">${$l("As Encrypted File")}</div>

                <pl-icon icon="copy" class="tap" @click=${() => this._copyEncrypted()}></pl-icon>

                <pl-icon
                    icon="download"
                    class="tap"
                    @click=${() => this._downloadEncrypted()}
                    ?hidden=${isCordova()}>
                </pl-icon>

            </div>

        </pl-dialog>
`;
    }

    private async _downloadCSV() {
        this.open = false;
        const confirmed = await confirm(exportCSVWarning, $l("Download"), $l("Cancel"), { type: "warning" }, true);
        this.open = true;
        if (confirmed) {
            const date = new Date().toISOString().substr(0, 10);
            const fileName = `padlock-export-${date}.csv`;
            const csv = await toCSV(this.records);
            const a = document.createElement("a");
            a.href = `data:application/octet-stream,${encodeURIComponent(csv)}`;
            a.download = fileName;
            a.click();
            this.dispatch("data-exported", { format: "csv", target: "file", records: this.records });
            this._done();
        }
    }

    private async _copyCSV() {
        this.open = false;
        const confirmed = await confirm(
            exportCSVWarning,
            $l("Copy to Clipboard"),
            $l("Cancel"),
            {
                type: "warning"
            },
            true
        );
        this.open = true;
        if (confirmed) {
            const csv = await toCSV(this.records);
            setClipboard(csv);
            this.dispatch("data-exported", { format: "csv", target: "clipboard", records: this.records });
            this._done();
            alert(
                $l(
                    "Your data has successfully been copied to the system " +
                        "clipboard. You can now paste it into the spreadsheet program of your choice."
                )
            );
        }
    }

    private async _getEncryptedData(): Promise<string> {
        this.open = false;
        const pwd = await prompt(
            $l(
                "Please choose a password to protect your data. This may be the same as " +
                    "your master password or something else, but make sure it is sufficiently strong!"
            ),
            {
                placeholder: $l("Enter Password"),
                type: "password",
                validate: async (pwd: string) => {
                    if (pwd === "") {
                        throw $l("Please enter a password!");
                    }
                    return pwd;
                }
            }
        );

        if (!pwd) {
            return "";
        }

        const strength = await passwordStrength(pwd);

        if (strength.score < 2) {
            const confirmed = await confirm(
                $l(
                    "WARNING: The password you entered is weak which makes it easier for " +
                        "attackers to break the encryption used to protect your data. Try to use a longer " +
                        "password or include a variation of uppercase, lowercase and special characters as " +
                        "well as numbers."
                ),
                $l("Use Anyway"),
                $l("Choose Different Password"),
                { type: "warning" },
                true
            );
            this.open = true;

            if (confirmed) {
                return toPadlock(this.records, pwd);
            } else {
                return this._getEncryptedData();
            }
        } else {
            this.open = true;
            return toPadlock(this.records, pwd);
        }
    }

    private async _downloadEncrypted() {
        const data = await this._getEncryptedData();
        if (!data) {
            return;
        }
        const a = document.createElement("a");
        const date = new Date().toISOString().substr(0, 10);
        const fileName = `padlock-export-${date}.pls`;
        a.href = `data:application/octet-stream,${encodeURIComponent(data)}`;
        a.download = fileName;
        setTimeout(() => {
            a.click();
            this.dispatch("data-exported", { format: "encrypted", target: "file", records: this.records });
            this._done();
        }, 500);
    }

    private async _copyEncrypted() {
        const data = await this._getEncryptedData();
        if (!data) {
            return;
        }
        // TODO: Does not work for some reason?
        await setClipboard(data);
        this.dispatch("data-exported", { format: "encrypted", target: "clipboad", records: this.records });
        this._done();
        alert($l("Your data has successfully been copied to the system clipboard."), { type: "success" });
    }

    private _done() {
        this._resolve && this._resolve();
        this._resolve = null;
        this.open = false;
    }

    show(records: Record[]): Promise<void> {
        this.records = records;
        this.open = true;
        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }
}
