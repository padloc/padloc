import { translate as $l } from "@padloc/locale/src/translate";
import { Group } from "@padloc/core/src/org";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { shared } from "../styles";
import { app } from "../globals";
import { BaseElement, element, html, property } from "./base";
import "./group-item";
import "./icon";
import "./scroller";
import "./group-view";
import "./list";
import "./popover";

@element("pl-org-groups")
export class OrgGroupsView extends Routing(StateMixin(BaseElement)) {
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
                    <header class="padded spacing center-aligning horizontal layout">
                        <pl-button
                            label="${$l("Menu")}"
                            class="transparent round narrow-only"
                            @click=${() => this.dispatch("toggle-menu")}
                        >
                            <pl-icon icon="menu"></pl-icon>
                        </pl-button>

                        <pl-button class="transparent skinny">
                            <div class="text-left-aligning">
                                <div class="highlight tiny ellipsis">${org.name}/</div>
                                <div>${$l("Groups")}</div>
                            </div>
                            <pl-icon icon="dropdown" class="small"></pl-icon>
                        </pl-button>

                        <pl-popover class="padded" alignment="right-bottom" hide-on-leave>
                            <pl-list role="nav">
                                <div
                                    class="padded spacing horizontal center-aligning layout list-item hover click"
                                    role="link"
                                    @click=${() => this.go(`orgs/${org.id}/members`)}
                                >
                                    <pl-icon icon="members"></pl-icon>
                                    <div>${$l("Members")}</div>
                                </div>
                                <div
                                    class="padded spacing horizontal center-aligning layout list-item hover click"
                                    role="link"
                                    @click=${() => this.go(`orgs/${org.id}/invites`)}
                                >
                                    <pl-icon icon="mail"></pl-icon>
                                    <div>${$l("Invites")}</div>
                                </div>
                                <div
                                    class="padded spacing horizontal center-aligning layout list-item hover click"
                                    role="link"
                                    @click=${() => this.go(`orgs/${org.id}/vaults`)}
                                >
                                    <pl-icon icon="vaults"></pl-icon>
                                    <div>${$l("Vaults")}</div>
                                </div>
                                <div
                                    class="padded spacing horizontal center-aligning layout list-item hover click"
                                    role="link"
                                    @click=${() => this.go(`orgs/${org.id}/settings`)}
                                >
                                    <pl-icon icon="settings"></pl-icon>
                                    <div>${$l("Settings")}</div>
                                </div>
                            </pl-list>
                        </pl-popover>

                        <div class="stretch"></div>

                        <pl-button class="transparent slim" @click=${() => this._createGroup()} ?hidden=${!isAdmin}>
                            <pl-icon icon="add"></pl-icon>
                        </pl-button>
                    </header>

                    <pl-scroller class="stretch">
                        <pl-list>
                            ${groups.map(
                                (group) => html`
                                    <div
                                        class="padded horizontally-margined list-item hover click"
                                        ?aria-selected=${group.name === this.groupName}
                                        @click=${() => this._toggleGroup(group)}
                                    >
                                        <pl-group-item .group=${group} .org=${this._org}></pl-group-item>
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
