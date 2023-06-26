import { css, customElement, html, query, state } from "@padloc/app/src/elements/lit";
import { View } from "@padloc/app/src/elements/view";
import { $l } from "@padloc/locale/src/translate";
import "@padloc/app/src/elements/icon";
import { StateMixin } from "@padloc/app/src/mixins/state";
import { Routing } from "@padloc/app/src/mixins/routing";
import "@padloc/app/src/elements/scroller";
import "@padloc/app/src/elements/list";
import "@padloc/app/src/elements/button";
import "@padloc/app/src/elements/spinner";
import "@padloc/app/src/elements/json-editor";
import { PadlocConfig } from "@padloc/core/src/config/padloc";
import { alert } from "@padloc/app/src/lib/dialog";
import { JSONEditor } from "@padloc/app/src/elements/json-editor";
import { wait } from "@padloc/core/src/util";

const configSchema = new PadlocConfig().getSchema();

@customElement("pl-admin-config")
export class AdminConfig extends StateMixin(Routing(View)) {
    readonly routePattern = /^config(?:\/(\w+))?/;

    @state()
    private _loading = false;

    @query("pl-json-editor")
    private _editor: JSONEditor;

    @state()
    private _config: PadlocConfig;

    private async _load(remainingTries = 0, retryAfter = 5000): Promise<void> {
        this._loading = true;
        try {
            this._config = await this.app.api.getConfig();
            this._loading = false;
        } catch (e) {
            if (remainingTries) {
                console.warn("Load failed with error", e, "Retrying after", retryAfter);
                await wait(retryAfter);
                return this._load(remainingTries - 1, retryAfter);
            } else {
                alert(e.message, { type: "warning" });
            }
        }
    }

    private async _submit() {
        const value = this._editor.value;
        const config = new PadlocConfig().fromJSON(value);
        this._loading = true;
        config.outputSecrets = true;
        try {
            await this.app.api.updateConfig(config);
            await wait(5000);
            await this._load(5);
        } catch (e) {
            alert(e.message, { type: "warning" });
        }
        config.outputSecrets = false;
        this._loading = false;
    }

    protected _activated(): void {
        this._load();
    }

    updated(changes: Map<string, unknown>) {
        super.updated(changes);
        if (changes.has("_config") && this._config) {
            this._editor.value = this._config?.toString();
        }
    }

    static styles = [...View.styles, css``];

    render() {
        return html`
            <div class="fullbleed vertical layout">
                <header class="padded center-aligning spacing horizontal layout border-bottom">
                    <pl-icon icon="settings"></pl-icon>
                    <div class="ellipsis">${$l("Config")}</div>

                    <div class="stretch"></div>

                    <pl-button class="skinny transparent" @click=${() => this._load()}>
                        <pl-icon icon="refresh"></pl-icon>
                    </pl-button>
                </header>

                <pl-json-editor class="stretch" .schema=${configSchema}></pl-json-editor>

                <div class="padded spacing evenly stretching horizontal layout">
                    <pl-button class="primary" @click=${this._submit}>${$l("Save & Restart")}</pl-button>
                    <pl-button class="transparent">${$l("Cancel")}</pl-button>
                </div>
            </div>

            <div class="fullbleed centering layout scrim" ?hidden=${!this._loading}>
                <pl-spinner .active=${this._loading}></pl-spinner>
            </div>
        `;
    }
}
