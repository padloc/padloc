import { translate as $l } from "@padloc/locale/src/translate";
import { Routing } from "../mixins/routing";
import { app } from "../globals";
import { customElement, property, state } from "lit/decorators.js";
import { html, LitElement } from "lit";
import "./list";
import "./popover";
import "./button";

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
    private _page?: { path: string; label: string; icon: string };

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

        const { label, icon } = this._page;

        return html`
            <pl-button
                class="transparent skinny"
                @click=${() => this.dispatchEvent(new CustomEvent("toggle-menu", { composed: true, bubbles: true }))}
            >
                <div class="horizontally-half-margined horizontal spacing center-aligning layout text-left-aligning">
                    <pl-icon icon="${icon}"></pl-icon>
                    <div class="stretch">
                        <div class="highlight tiny center-aligning horizontal layout">
                            <div class="bold stretch ellipsis horizontally-half-margined">${this._org.name}</div>
                        </div>
                        <div class="bold ellipsis">${label}</div>
                    </div>
                </div>
            </pl-button>
        `;
    }
}
