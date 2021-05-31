import { translate as $l } from "@padloc/locale/src/translate";
import { Invite } from "@padloc/core/src/invite";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { dialog, alert } from "../lib/dialog";
import { app } from "../globals";
import { shared } from "../styles";
import { Input } from "./input";
import { CreateInvitesDialog } from "./create-invites-dialog";
import "./invite-item";
import "./icon";
import "./invite-view";
import "./list";
import "./org-nav";
import { customElement, property, query, state } from "lit/decorators.js";
import { html, LitElement } from "lit";

@customElement("pl-org-invites")
export class OrgInvitesView extends Routing(StateMixin(LitElement)) {
    readonly routePattern = /^orgs\/([^\/]+)\/invites(?:\/([^\/]+))?/;

    @property()
    orgId: string = "";

    @property()
    inviteId?: string;

    @query("#filterInput")
    private _filterInput: Input;

    @dialog("pl-create-invites-dialog")
    private _createInvitesDialog: CreateInvitesDialog;

    private get _org() {
        return app.getOrg(this.orgId);
    }

    @state()
    private _filter: string = "";

    @state()
    private _filterActive: boolean = false;

    handleRoute([orgId, inviteId]: [string, string]) {
        this.orgId = orgId;
        this.inviteId = inviteId;
    }

    private async _createInvite() {
        const invites = await this._createInvitesDialog.show(this._org!);
        if (invites) {
            if (invites.length === 1) {
                this.go(`orgs/${this.orgId}/invites/${invites[0].id}`);
            } else {
                alert($l("Successfully created {0} invites!", invites.length.toString()));
            }
        }
    }

    private _updateFilter() {
        this._filter = this._filterInput.value;
    }

    private async _toggleInvite(invite: Invite) {
        if (this.inviteId === invite.id) {
            this.go(`orgs/${this.orgId}/invites/`);
        } else {
            this.go(`orgs/${this.orgId}/invites/${invite.id}`);
        }
    }

    private _clearFilter() {
        this._filter = this._filterInput.value = "";
        this._filterActive = false;
    }

    private async _showFilter() {
        this._filterActive = true;
        await this.updateComplete;
        this._filterInput.focus();
    }

    static styles = [shared];

    render() {
        if (!this._org) {
            return;
        }

        const org = this._org!;
        const isOwner = org.isOwner(app.account!);
        const memFilter = this._filter.toLowerCase();
        const invites = memFilter
            ? org.invites.filter(({ email }) => email.toLowerCase().includes(memFilter))
            : org.invites;

        return html`
            <div class="fullbleed pane layout background ${this.inviteId ? "open" : ""}">
                <div class="vertical layout">
                    <header class="padded center-aligning horizontal layout" ?hidden=${this._filterActive}>
                        <pl-button
                            label="${$l("Menu")}"
                            class="transparent menu-button"
                            @click=${() => this.dispatchEvent(new CustomEvent("toggle-menu"))}
                        >
                            <pl-icon icon="menu"></pl-icon>
                        </pl-button>

                        <pl-org-nav></pl-org-nav>

                        <div class="stretch"></div>

                        <pl-button class="transparent" @click=${() => this._showFilter()} ?hidden=${!isOwner}>
                            <pl-icon icon="search"></pl-icon>
                        </pl-button>

                        <pl-button class="transparent" @click=${() => this._createInvite()} ?hidden=${!isOwner}>
                            <pl-icon icon="add"></pl-icon>
                        </pl-button>
                    </header>

                    <header class="padded" ?hidden=${!this._filterActive}>
                        <pl-input
                            class="transparent slim dashed"
                            id="filterInput"
                            placeholder="${$l("Search...")}"
                            @input=${this._updateFilter}
                        >
                            <pl-icon icon="search" slot="before" class="left-margined"></pl-icon>
                            <pl-button class="slim transparent" slot="after" @click=${this._clearFilter}>
                                <pl-icon icon="cancel"></pl-icon>
                            </pl-button>
                        </pl-input>
                    </header>

                    <pl-scroller class="stretch">
                        <pl-list>
                            ${invites.map(
                                (invite) => html`
                                    <div
                                        class="padded list-item horizontally-margined hover click"
                                        aria-selected=${invite.id === this.inviteId}
                                        @click=${() => this._toggleInvite(invite)}
                                    >
                                        <pl-invite-item .invite=${invite} .org=${this._org}></pl-invite-item>
                                    </div>
                                `
                            )}
                        </pl-list>
                    </pl-scroller>
                </div>

                <pl-invite-view></pl-invite-view>
            </div>
        `;
    }
}
