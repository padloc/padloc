import { stringToBytes } from "@padloc/core/src/encoding";
import { saveFile } from "@padloc/core/src/platform";
import { Vault } from "@padloc/core/src/vault";
import { translate as $l } from "@padloc/locale/src/translate";
import JSZip from "jszip";
import { app } from "../globals";
import { prompt } from "../lib/dialog";
import { asCSV, asPBES2Container, supportedFormats } from "../lib/export";
import { CSV, PBES2 } from "../lib/import";
import type { Select } from "./select";
import "./select";
import { html } from "lit";
import { customElement, query } from "lit/decorators.js";
import { Dialog } from "./dialog";

const ALL_VAULTS_OPTION = $l("All Vaults");

@customElement("pl-export-dialog")
export class ExportDialog extends Dialog<void, void> {
    @query("#formatSelect")
    private _formatSelect: Select<string>;
    @query("#vaultSelect")
    private _vaultSelect: Select<Vault | string>;

    renderContent() {
        const vault = this._vaultSelect?.value;
        const itemCount =
            vault instanceof Vault
                ? vault.items.size
                : app.vaults.reduce((currentItemCount, appVault) => appVault.items.size + currentItemCount, 0);

        return html`
            <div class="padded vertical spacing layout">
                <h1 class="big margined text-centering">${$l("Export Data")}</h1>

                <pl-select
                    id="vaultSelect"
                    .options=${[ALL_VAULTS_OPTION, ...app.vaults].map((v) => ({ value: v }))}
                    .label=${$l("Target Vault")}
                    @change=${() => this.requestUpdate()}
                >
                </pl-select>

                <pl-select
                    id="formatSelect"
                    .options=${supportedFormats}
                    .label=${$l("Format")}
                    @change=${() => this.requestUpdate()}
                ></pl-select>

                <div class="small padded" ?hidden=${this._formatSelect && this._formatSelect.value !== CSV.value}>
                    ${$l(
                        `WARNING: Exporting to CSV format will save your data without encryption of any kind which means it can be read by anyone. We strongly recommend exporting your data as a secure, encrypted file, instead!`
                    )}
                </div>

                <div class="horizontal evenly stretching spacing layout">
                    <pl-button class="primary" @click=${() => this._export()}>
                        ${$l("Export {0} Items", itemCount.toString())}
                    </pl-button>
                    <pl-button @click=${this.dismiss}> ${$l("Cancel")} </pl-button>
                </div>
            </div>
        `;
    }

    async show() {
        await this.updateComplete;
        this._formatSelect.value = PBES2.value;
        this._vaultSelect.value = app.mainVault!;
        return super.show();
    }

    private async _exportData(vault: Vault, password: string) {
        const items = [...vault.items];
        const date = new Date().toISOString().substring(0, 10);
        let data = "";
        let fileName = "";
        let type = "text/plain";

        switch (this._formatSelect.value) {
            case CSV.value:
                data = await asCSV(items);
                fileName = `${vault.name.replace(/ /g, "_")}_${date}.csv`;
                type = "text/csv";
                break;

            case PBES2.value:
                this.open = false;
                data = await asPBES2Container(items, password);
                fileName = `${vault.name.replace(/ /g, "_")}_${date}.pbes2`;
                break;

            default:
                return;
        }

        return {
            data,
            fileName,
            type,
        };
    }

    private async _export() {
        const vaultOption = this._vaultSelect.value!;

        // Ask for password once
        let password = "";
        if (this._formatSelect.value === PBES2.value) {
            this.open = false;
            password = await prompt($l("Please choose a password to protect this backup with!"), {
                title: $l("Choose Password"),
                type: "password",
                placeholder: "Enter Password",
                validate: async (val) => {
                    if (!val) {
                        throw $l("Please choose a password!");
                    }
                    return val;
                },
            });

            if (!password) {
                this.open = true;
                return;
            }

            const repeated = await prompt($l("Please repeat the password!"), {
                title: $l("Choose Password"),
                type: "password",
                placeholder: "Repeat Password",
                validate: async (val) => {
                    if (val !== password) {
                        throw $l("Password not repeated correctly!");
                    }
                    return val;
                },
            });

            if (!repeated) {
                this.open = true;
                return;
            }
        }

        if (vaultOption === ALL_VAULTS_OPTION) {
            const zip = new JSZip();

            const date = new Date().toISOString().substring(0, 10);
            const zipFileName = `All_Vaults_${date}.zip`;
            const zipFileType = "application/zip";

            for (const vault of app.vaults) {
                const result = await this._exportData(vault, password);
                if (result) {
                    const { data, fileName } = result;
                    zip.file(fileName, stringToBytes(data));
                }
            }

            const zipData = await zip.generateAsync({ type: "uint8array" });

            saveFile(zipFileName, zipFileType, zipData);
        } else {
            const result = await this._exportData(this._vaultSelect.value! as Vault, password);
            if (result) {
                const { data, fileName, type } = result;
                saveFile(fileName, type, stringToBytes(data));
            }
        }

        this.done();
    }
}
