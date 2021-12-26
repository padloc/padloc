import "./button";
import "./scroller";
import { html, LitElement } from "lit";
import { StateMixin } from "../mixins/state";
import { router } from "../globals";
import { translate as $l } from "@padloc/locale/src/translate";
import { customElement, query } from "lit/decorators.js";
import { shared } from "../styles";
import { ToggleButton } from "./toggle-button";
import "./popover";
import "./icon";

@customElement("pl-settings-extension")
export class SettingsExtension extends StateMixin(LitElement) {
    static styles = [shared];

    @query("#badgeButton")
    private _badgeButton: ToggleButton;

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("change", () => this._updateSettings());
    }

    private _updateSettings() {
        this.app.setSettings({
            extensionBadge: this._badgeButton.active,
        });
    }

    render() {
        return html`
            <div class="fullbleed vertical layout stretch background">
                <header class="padded center-aligning horizontal layout">
                    <pl-button class="transparent slim back-button" @click=${() => router.go("settings")}>
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>
                    <pl-icon icon="extension" class="left-margined vertically-padded wide-only"></pl-icon>
                    <div class="padded stretch ellipsis">${$l("Extension")}</div>
                </header>

                <pl-scroller class="stretch">
                    <div class="double-margined box">
                        <h2 class="padded bg-dark border-bottom semibold horizontal center-aligning layout">
                            <div class="uppercase stretch">${$l("Badge")}</div>
                            <pl-icon icon="info-round" class="subtle"></pl-icon>
                            <pl-popover trigger="hover" class="small double-padded regular" style="max-width: 20em">
                                ${$l(
                                    "If this option is enabled, the extension icon will show a badge with the number of matching items (if any) for the currently active tab. NOTE: Changing this setting can take up to a minute to take effect."
                                )}
                            </pl-popover>
                        </h2>

                        <div>
                            <pl-toggle-button
                                class="transparent"
                                id="badgeButton"
                                .active=${this.state.settings.extensionBadge}
                                .label=${$l("Enable Badge")}
                                reverse
                            >
                            </pl-toggle-button>
                        </div>
                    </div>
                </pl-scroller>
            </div>
        `;
    }
}
