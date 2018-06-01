import "../styles/shared.js";
import { localize as $l } from "../core/locale.js";
import { BaseElement, html } from "./base.js";
import "./icon.js";
import { applyMixins, passwordStrength } from "../core/util.js";
import { isCordova, setClipboard } from "../core/platform.js";
import { toPadlock, toCSV } from "../core/export.js";
import { LocaleMixin, DialogMixin, DataMixin } from "../mixins";

const exportCSVWarning = $l(
    "WARNING: Exporting to CSV format will save your data without encyryption of any " +
        "kind which means it can be read by anyone. We strongly recommend exporting your data as " +
        "a secure, encrypted file, instead! Are you sure you want to proceed?"
);

class PlExport extends applyMixins(BaseElement, DataMixin, LocaleMixin, DialogMixin) {
    static get template() {
        return html`
        <style include="shared">
            :host {
                display: block;
            }

            .row {
                display: flex;
                align-items: center;
            }

            .label {
                padding: 0 15px;
                flex: 1;
            }

            pl-icon {
                width: 50px;
                height: 50px;
            }
        </style>

        <div class="tiles tiles-1 row">
            <div class="label">[[ \$l("As CSV") ]]</div>
            <pl-icon icon="copy" class="tap" on-click="_copyCSV"></pl-icon>
            <pl-icon icon="download" class="tap" on-click="_downloadCSV" hidden\$="[[ _isMobile() ]]"></pl-icon>
        </div>
        <div class="tiles tiles-2 row">
            <div class="label">[[ \$l("As Encrypted File") ]]</div>
            <pl-icon icon="copy" class="tap" on-click="_copyEncrypted"></pl-icon>
            <pl-icon icon="download" class="tap" on-click="_downloadEncrypted" hidden\$="[[ _isMobile() ]]"></pl-icon>
        </div>
`;
    }

    static get is() {
        return "pl-export";
    }

    static get properties() {
        return {
            exportRecords: Array
        };
    }

    _downloadCSV() {
        this.confirm(exportCSVWarning, $l("Download"), $l("Cancel"), { type: "warning" }).then(confirm => {
            if (confirm) {
                setTimeout(async () => {
                    const date = new Date().toISOString().substr(0, 10);
                    const fileName = `padlock-export-${date}.csv`;
                    const csv = await toCSV(this.exportRecords);
                    const a = document.createElement("a");
                    a.href = `data:application/octet-stream,${encodeURIComponent(csv)}`;
                    a.download = fileName;
                    a.click();
                    this.dispatch("data-exported");
                }, 500);
            }
        });
    }

    async _copyCSV() {
        const confirmed = await this.confirm(exportCSVWarning, $l("Copy to Clipboard"), $l("Cancel"), {
            type: "warning"
        });
        if (confirmed) {
            const csv = await toCSV(this.exportRecords);
            setClipboard(csv);
            this.alert(
                $l(
                    "Your data has successfully been copied to the system " +
                        "clipboard. You can now paste it into the spreadsheet program of your choice."
                )
            );
            this.dispatch("data-exported");
        }
    }

    async _getEncryptedData() {
        const pwd = await this.prompt(
            $l(
                "Please choose a password to protect your data. This may be the same as " +
                    "your master password or something else, but make sure it is sufficiently strong!"
            ),
            $l("Enter Password"),
            "password",
            $l("Confirm"),
            $l("Cancel")
        );

        if (!pwd) {
            if (pwd === "") {
                this.alert($l("Please enter a password!"));
            }
            return Promise.reject();
        }

        const strength = await passwordStrength(pwd);

        if (strength.score < 2) {
            const confirmed = await this.confirm(
                $l(
                    "WARNING: The password you entered is weak which makes it easier for " +
                        "attackers to break the encryption used to protect your data. Try to use a longer " +
                        "password or include a variation of uppercase, lowercase and special characters as " +
                        "well as numbers."
                ),
                $l("Use Anyway"),
                $l("Choose Different Password"),
                { type: "warning" }
            );

            if (confirmed) {
                return toPadlock(this.exportRecords, pwd);
            } else {
                return this._getEncryptedData();
            }
        } else {
            return toPadlock(this.exportRecords, pwd);
        }
    }

    _downloadEncrypted() {
        this._getEncryptedData().then(data => {
            const a = document.createElement("a");
            const date = new Date().toISOString().substr(0, 10);
            const fileName = `padlock-export-${date}.pls`;
            a.href = `data:application/octet-stream,${encodeURIComponent(data)}`;
            a.download = fileName;
            setTimeout(() => {
                a.click();
                this.dispatch("data-exported");
            }, 500);
        });
    }

    _copyEncrypted() {
        this._getEncryptedData().then(data => {
            setClipboard(data).then(() => {
                this.alert($l("Your data has successfully been copied to the system clipboard."), { type: "success" });
            });
            this.dispatch("data-exported");
        });
    }

    _isMobile() {
        return isCordova();
    }
}

window.customElements.define(PlExport.is, PlExport);
