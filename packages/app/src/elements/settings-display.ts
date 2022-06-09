import "./button";
import "./scroller";
import { html, LitElement } from "lit";
import { StateMixin } from "../mixins/state";
import { router } from "../globals";
import { translate as $l } from "@padloc/locale/src/translate";
import { customElement, query } from "lit/decorators.js";
import { shared } from "../styles";
import { Select } from "./select";
import { Settings } from "@padloc/core/src/app";
import { ToggleButton } from "./toggle-button";
import "./popover";
import "./icon";

@customElement("pl-settings-display")
export class SettingsDisplay extends StateMixin(LitElement) {
    static styles = [shared];

    @query("#themeSelect")
    private _themeSelect: Select<Settings["theme"]>;

    @query("#faviconsButton")
    private _faviconsButton: ToggleButton;

    @query("#unmaskFieldsOnHoverButton")
    private _unmaskFieldsOnHoverButton: ToggleButton;

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("change", () => this._updateSettings());
    }

    private _updateSettings() {
        this.app.setSettings({
            theme: this._themeSelect.value || undefined,
            favicons: this._faviconsButton.active,
            unmaskFieldsOnHover: this._unmaskFieldsOnHoverButton.active,
        });
    }

    render() {
        return html`
            <div class="fullbleed vertical layout stretch background">
                <header class="padded center-aligning horizontal layout">
                    <pl-button class="transparent slim back-button" @click=${() => router.go("settings")}>
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>
                    <pl-icon icon="display" class="left-margined vertically-padded wide-only"></pl-icon>
                    <div class="padded stretch ellipsis">${$l("Display")}</div>
                </header>

                <pl-scroller class="stretch">
                    <div class="double-margined box">
                        <h2 class="padded uppercase bg-dark border-bottom semibold">${$l("Theme")}</h2>

                        <pl-select
                            class="transparent"
                            .options=${[{ value: "auto" }, { value: "light" }, { value: "dark" }]}
                            id="themeSelect"
                            .value=${this.state.settings.theme as any}
                        ></pl-select>
                    </div>

                    <div class="double-margined box">
                        <h2 class="padded bg-dark border-bottom semibold horizontal center-aligning layout">
                            <div class="uppercase stretch">${$l("Favicons")}</div>
                            <pl-icon icon="info-round" class="subtle"></pl-icon>
                            <pl-popover trigger="hover" class="small double-padded regular" style="max-width: 20em">
                                ${$l(
                                    "If this option is enabled, {0} will automatically load and display website icons for vault items that have at least one URL field.",
                                    process.env.PL_APP_NAME!
                                )}
                            </pl-popover>
                        </h2>

                        <div>
                            <pl-toggle-button
                                class="transparent"
                                id="faviconsButton"
                                .active=${this.state.settings.favicons}
                                .label=${$l("Enable Favicons")}
                                reverse
                            >
                            </pl-toggle-button>
                        </div>
                    </div>

                    <div class="double-margined box">
                        <h2 class="padded bg-dark border-bottom semibold horizontal center-aligning layout">
                            <div class="uppercase stretch">${$l("Masked Fields")}</div>
                            <pl-icon icon="info-round" class="subtle"></pl-icon>
                            <pl-popover trigger="hover" class="small double-padded regular" style="max-width: 20em">
                                ${$l(
                                    "If this option is enabled, masked fields such as passwords or credit card " +
                                        "numbers will be unmasked when you move your mouse over them." +
                                        "Disable this option if you would rather use an explicit button."
                                )}
                            </pl-popover>
                        </h2>

                        <div>
                            <pl-toggle-button
                                class="transparent"
                                id="unmaskFieldsOnHoverButton"
                                .active=${this.state.settings.unmaskFieldsOnHover}
                                .label=${$l("Reveal On Hover")}
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
