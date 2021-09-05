import { Routing } from "../mixins/routing";
import { StateMixin } from "../mixins/state";
import { shared } from "../styles";
import "./org-members";
import "./org-groups";
import "./org-invites";
import "./org-settings";
import "./org-vaults";
import "./org-dashboard";
import { state, customElement } from "lit/decorators.js";
import { html, LitElement } from "lit";

@customElement("pl-org-view")
export class OrgView extends Routing(StateMixin(LitElement)) {
    readonly routePattern = /^orgs\/([^\/]+)(?:\/(\w+))?/;

    private readonly _pages = ["dashboard", "members", "groups", "vaults", "invites", "settings"];

    @state()
    private _page: string = "members";

    handleRoute([id, page]: [string, string]) {
        const org = this.app.getOrg(id);
        if (!org?.isAdmin(this.app.account!)) {
            this.redirect("");
        }

        if (!page || !this._pages.includes(page)) {
            this.redirect(`orgs/${id}/${this._pages[0]}`);
            return;
        }

        this._page = page;
    }

    static styles = [shared];

    render() {
        return html`
            <pl-org-members class="fullbleed" ?hidden=${this._page !== "members"}></pl-org-members>
            <pl-org-groups class="fullbleed" ?hidden=${this._page !== "groups"}></pl-org-groups>
            <pl-org-invites class="fullbleed" ?hidden=${this._page !== "invites"}></pl-org-invites>
            <pl-org-vaults class="fullbleed" ?hidden=${this._page !== "vaults"}></pl-org-vaults>
            <pl-org-settings class="fullbleed" ?hidden=${this._page !== "settings"}></pl-org-settings>
            <pl-org-dashboard class="fullbleed" ?hidden=${this._page !== "dashboard"}></pl-org-dashboard>
        `;
    }
}
