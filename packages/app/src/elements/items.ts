import { element, html, query, property } from "./base";
import { View } from "./view";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { ItemsList, ItemsFilter } from "./items-list";
import "./item-view";

@element("pl-items")
export class ItemsView extends Routing(StateMixin(View)) {
    routePattern = /^items(?:\/([^\/]+))?/;

    @property()
    selected: string | null = null;

    @property()
    filter?: ItemsFilter;

    @query("pl-items-list")
    private _list: ItemsList;

    handleRoute([id]: [string], { vault, tag, favorites, attachments, recent, host }: { [prop: string]: string }) {
        this.filter = {
            vault,
            tag,
            favorites: favorites === "true",
            attachments: attachments === "true",
            recent: recent === "true",
            host: host === "true",
        };
        this.selected = id;
    }

    search() {
        this._list.search();
    }

    render() {
        return html`
            <div class="fullbleed pane layout ${!!this.selected ? "open" : ""}">
                <pl-items-list .selected=${this.selected} .filter=${this.filter}></pl-items-list>

                <pl-item-view></pl-item-view>
            </div>
        `;
    }
}
