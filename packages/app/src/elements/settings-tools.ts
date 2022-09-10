import "./button";
import "./scroller";
import { html, LitElement } from "lit";
import { StateMixin } from "../mixins/state";
import { router } from "../globals";
import { dialog } from "../lib/dialog";
import { translate as $l } from "@padloc/locale/src/translate";
import { customElement, query } from "lit/decorators.js";
import { shared } from "../styles";
import { ImportDialog } from "./import-dialog";
import { ExportDialog } from "./export-dialog";

@customElement("pl-settings-tools")
export class SettingsTools extends StateMixin(LitElement) {
    @query("input[type='file']")
    private _fileInput: HTMLInputElement;

    @dialog("pl-import-dialog")
    private _importDialog: ImportDialog;

    @dialog("pl-export-dialog")
    private _exportDialog: ExportDialog;

    private async _import() {
        this._fileInput.click();
    }

    private async _importFile() {
        const file = this._fileInput.files![0];
        await this._importDialog.show(file);
        this._fileInput.value = "";
    }

    private _export() {
        this._exportDialog.show();
    }

    static styles = [shared];

    render() {
        return html`
            <div class="fullbleed vertical layout stretch background">
                <header class="padded center-aligning horizontal layout">
                    <pl-button class="transparent slim back-button" @click=${() => router.go("settings")}>
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>
                    <pl-icon icon="tools" class="left-margined vertically-padded wide-only"></pl-icon>
                    <div class="padded stretch ellipsis">${$l("Tools")}</div>
                </header>

                <pl-scroller class="stretch">
                    <div class="double-margined box">
                        <h2 class="padded uppercase bg-dark semibold">${$l("Import / Export")}</h2>

                        <div class="list-item">
                            <pl-button class="transparent" @click=${() => this._import()}>
                                <pl-icon icon="import" class="right-margined"></pl-icon>
                                <div>${$l("Import...")}</div>
                            </pl-button>
                        </div>

                        <div class="list-item">
                            <pl-button class="transparent" @click=${() => this._export()}>
                                <pl-icon icon="export" class="right-margined"></pl-icon>
                                <div>${$l("Export...")}</div>
                            </pl-button>
                        </div>
                    </div>
                </pl-scroller>
            </div>

            <input
                type="file"
                accept="text/plain,.csv,.pls,.set,.pbes2,.1pux,.json"
                hidden
                @change=${() => this._importFile()}
            />
        `;
    }
}
