import { translate as $l } from "@padloc/locale/src/translate";
import { Routing } from "../mixins/routing";
import { app } from "../globals";
import { customElement, property, state } from "lit/decorators";
import { html, LitElement } from "lit";

@customElement("pl-org-nav")
export class OrgNav extends Routing(LitElement) {
    readonly routePattern = /^orgs\/([^\/]+)(?:\/(\w+))?/;

    @property()
    orgId: string;

    private get _org() {
        return app.getOrg(this.orgId);
    }

    private _pages = [
        { path: "dashboard", label: $l("Dashboard"), icon: "dashboard" },
        { path: "members", label: $l("Members"), icon: "members" },
        { path: "groups", label: $l("Groups"), icon: "group" },
        { path: "vaults", label: $l("Vaults"), icon: "vaults" },
        { path: "settings", label: $l("Settings"), icon: "settings" },
        { path: "invites", label: $l("Invites"), icon: "mail" },
    ];

    @state()
    private _page?: { path: string; label: string };

    handleRoute([org, page]: [string, string]) {
        this.orgId = org;
        this._page = this._pages.find((p) => p.path === page);
    }

    createRenderRoot() {
        return this;
    }

    render() {
        if (!this._org || !this._page) {
            return;
        }

        return html`
            <pl-button class="transparent skinny">
                <div class="text-left-aligning">
                    <div class="highlight tiny ellipsis">${this._org.name}/</div>
                    <div>${this._page.label}</div>
                </div>
                <pl-icon icon="dropdown" class="small"></pl-icon>
            </pl-button>

            <pl-popover class="padded" alignment="right-bottom" hide-on-leave>
                <pl-list role="navigation">
                    ${this._pages.map(
                        (p) => html`
                            <div
                                class="padded spacing horizontal center-aligning layout list-item hover click"
                                role="link"
                                @click=${() => this.go(`orgs/${this.orgId}/${p.path}`)}
                                aria-selected=${p.path === this._page!.path}
                            >
                                <pl-icon icon="${p.icon}"></pl-icon>
                                <div>${p.label}</div>
                            </div>
                        `
                    )}
                </pl-list>
            </pl-popover>
        `;
    }
}
