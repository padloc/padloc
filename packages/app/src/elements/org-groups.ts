import { Group } from "@padloc/core/src/org";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { shared } from "../styles";
import { app } from "../globals";
import "./group-item";
import "./icon";
import "./scroller";
import "./group-view";
import "./list";
import "./org-nav";
import { customElement, property } from "lit/decorators.js";
import { html, LitElement } from "lit";
import { checkFeatureDisabled } from "../lib/provisioning";

@customElement("pl-org-groups")
export class OrgGroupsView extends Routing(StateMixin(LitElement)) {
    readonly routePattern = /^orgs\/([^\/]+)\/groups(?:\/([^\/]+))?/;

    @property()
    orgId: string = "";

    @property()
    groupName?: string;

    private get _org() {
        return app.getOrg(this.orgId);
    }

    handleRoute([orgId, groupName]: [string, string]) {
        this.orgId = orgId;
        this.groupName = groupName && decodeURIComponent(groupName);

        if (
            this._org &&
            this.groupName === "new" &&
            checkFeatureDisabled(app.getOrgFeatures(this._org).addGroup, this._org.isOwner(app.account!))
        ) {
            this.redirect(`orgs/${orgId}/groups`);
        }
    }

    private async _createGroup() {
        this.go(`orgs/${this.orgId}/groups/new`);
    }

    private async _toggleGroup(group: Group) {
        if (this.groupName === group.name) {
            this.go(`orgs/${this.orgId}/groups/`);
        } else {
            this.go(`orgs/${this.orgId}/groups/${encodeURIComponent(group.name)}`);
        }
    }

    static styles = [shared];

    render() {
        if (!this._org) {
            return;
        }

        const org = this._org!;
        const isAdmin = org.isAdmin(app.account!);
        const groups = org.groups.sort((a, b) => (a.name < b.name ? -1 : 1));

        return html`
            <div class="fullbleed pane layout background ${this.groupName ? "open" : ""}">
                <div class="vertical layout">
                    <header class="padded center-aligning horizontal layout">
                        <pl-org-nav></pl-org-nav>

                        <div class="stretch"></div>

                        <pl-button class="transparent" @click=${() => this._createGroup()} ?hidden=${!isAdmin}>
                            <pl-icon icon="add"></pl-icon>
                        </pl-button>
                    </header>

                    <pl-scroller class="stretch">
                        <pl-list>
                            ${groups.map(
                                (group) => html`
                                    <div
                                        class="double-padded list-item hover click"
                                        aria-selected=${group.name === this.groupName}
                                        @click=${() => this._toggleGroup(group)}
                                    >
                                        <pl-group-item .group=${group}></pl-group-item>
                                    </div>
                                `
                            )}
                        </pl-list>
                    </pl-scroller>
                </div>

                <pl-group-view></pl-group-view>
            </div>
        `;
    }
}
