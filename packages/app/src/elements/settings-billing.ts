import "./scroller";
import { html, LitElement } from "lit";
import { StateMixin } from "../mixins/state";
import { router } from "../globals";
import { translate as $l } from "@padloc/locale/src/translate";
import { customElement } from "lit/decorators.js";
import { shared } from "../styles";
import "./markdown-content";
import { ProvisioningStatus } from "@padloc/core/src/provisioning";

@customElement("pl-settings-billing")
export class SettingsBilling extends StateMixin(LitElement) {
    static styles = [shared];

    render() {
        const provisioning = this.app.getAccountProvisioning();
        if (!provisioning) {
            return;
        }
        return html`
            <div class="fullbleed vertical layout stretch background">
                <header class="padded center-aligning horizontal layout">
                    <pl-button class="transparent back-button" @click=${() => router.go("settings")}>
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>
                    <pl-icon icon="billing" class="left-margined vertically-padded wide-only"></pl-icon>
                    <div class="padded stretch ellipsis">${$l("Billing")}</div>
                    ${provisioning.statusLabel
                        ? html`<div
                              class="small tag ${provisioning.status === ProvisioningStatus.Active
                                  ? "highlight"
                                  : "warning"}"
                          >
                              ${provisioning.statusLabel}
                          </div>`
                        : ""}
                </header>

                <pl-scroller class="stretch">
                    <div class="double-padded centering vertical layout">
                        <div class="spacing vertical layout" style="width: 100%; max-width: 30em;">
                            <pl-markdown-content
                                .content=${provisioning.statusMessage}
                                class="padded"
                            ></pl-markdown-content>

                            ${provisioning.actionUrl
                                ? html`
                                      <pl-button @click=${() => window.open(provisioning.actionUrl, "_blank")}
                                          >${provisioning.actionLabel || $l("Learn More")}</pl-button
                                      >
                                  `
                                : ""}
                        </div>
                    </div>
                </pl-scroller>
            </div>
        `;
    }
}
