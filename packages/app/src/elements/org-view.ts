import { Routing } from "../mixins/routing";
import { StateMixin } from "../mixins/state";
import { BaseElement, element, html, property } from "./base";
import "./org-members";

@element("pl-org-view")
export class OrgView extends Routing(StateMixin(BaseElement)) {
    readonly routePattern = /^orgs\/([^\/]+)(?:\/(\w+))?/;

    private readonly _pages = ["members", "groups", "vaults", "settings"];

    @property()
    private _page: string = "members";

    handleRoute([id, page]: [string, string]) {
        if (!page || !this._pages.includes(page)) {
            this.redirect(`orgs/${id}/${this._pages[0]}`);
            return;
        }

        this._page = page;
    }

    render() {
        return html`
            <pl-org-members class="fullbleed" ?hidden=${this._page !== "members"}></pl-org>
        `;
    }
}
