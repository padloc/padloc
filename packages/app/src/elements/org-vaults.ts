import { VaultID } from "@padloc/core/src/vault";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { app } from "../globals";
import { shared } from "../styles";
import "./vault-item";
import "./icon";
import "./vault-view";
import "./list";
import "./org-nav";
import { customElement, property } from "lit/decorators.js";
import { html, LitElement } from "lit";
import { checkFeatureDisabled } from "../lib/provisioning";

@customElement("pl-org-vaults")
export class OrgVaultsView extends Routing(StateMixin(LitElement)) {
    readonly routePattern = /^orgs\/([^\/]+)\/vaults(?:\/([^\/]+))?/;

    @property()
    orgId: string = "";

    @property()
    vaultId?: string;

    private get _org() {
        return app.getOrg(this.orgId);
    }

    handleRoute([orgId, vaultId]: [string, string]) {
        this.orgId = orgId;
        this.vaultId = vaultId;

        if (this._org && this.vaultId === "new" && checkFeatureDisabled(app.getOrgFeatures(this._org).addVault)) {
            this.redirect(`orgs/${orgId}/vaults`);
        }
    }

    private async _toggleVault(vault: { id: VaultID }) {
        if (this.vaultId === vault.id) {
            this.go(`orgs/${this.orgId}/vaults/`);
        } else {
            this.go(`orgs/${this.orgId}/vaults/${vault.id}`);
        }
    }

    private async _createVault() {
        this.go(`orgs/${this.orgId}/vaults/new`);
    }

    static styles = [shared];

    render() {
        if (!this._org) {
            return;
        }

        const org = this._org;
        const vaults = org.vaults;
        const isAdmin = org.isAdmin(app.account!);

        return html`
            <div class="fullbleed pane layout background ${this.vaultId ? "open" : ""}">
                <div class="vertical layout">
                    <header class="padded center-aligning horizontal layout">
                        <pl-org-nav></pl-org-nav>

                        <div class="stretch"></div>

                        <pl-button class="transparent" @click=${() => this._createVault()} ?hidden=${!isAdmin}>
                            <pl-icon icon="add"></pl-icon>
                        </pl-button>
                    </header>

                    <pl-scroller class="stretch">
                        <pl-list>
                            ${vaults.map(
                                (vault) => html`
                                    <div
                                        class="double-padded list-item hover click"
                                        aria-selected=${vault.id === this.vaultId}
                                        @click=${() => this._toggleVault(vault)}
                                    >
                                        <pl-vault-item .vault=${vault} .org=${this._org}></pl-vault-item>
                                    </div>
                                `
                            )}
                        </pl-list>
                    </pl-scroller>
                </div>

                <pl-vault-view></pl-vault-view>
            </div>
        `;
    }
}
