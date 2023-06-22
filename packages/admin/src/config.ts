import { css, customElement, html } from "@padloc/app/src/elements/lit";
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

const configSchema = new PadlocConfig().getSchema();

@customElement("pl-admin-config")
export class AdminConfig extends StateMixin(Routing(View)) {
    readonly routePattern = /^config(?:\/(\w+))?/;

    static styles = [...View.styles, css``];

    private _config: PadlocConfig;

    private async _load() {
        this._config = await this.app.api.getConfig();
    }

    protected _activated(): void {
        this._load();
    }

    render() {
        return html`
            <div class="fullbleed vertical layout">
                <header class="padded center-aligning spacing horizontal layout border-bottom">
                    <pl-icon icon="settings"></pl-icon>
                    <div class="ellipsis">${$l("Config")}</div>

                    <div class="stretch"></div>
                </header>

                <pl-json-editor
                    class="stretch"
                    .schema=${configSchema}
                    .value=${this._config?.toString() || ""}
                ></pl-json-editor>
            </div>
        `;
    }
}
