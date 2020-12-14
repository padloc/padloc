import { element, html, query, property } from "./base";
import { View } from "./view";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { ItemsList, ItemsFilter } from "./items-list";
import { ItemView } from "./item-view";

@element("pl-items")
export class ItemsView extends Routing(StateMixin(View)) {
    routePattern = /^items(?:\/([^\/]+))?/;

    @property()
    selected: string | null = null;

    @property()
    filter?: ItemsFilter;

    @query("pl-items-list")
    private _list: ItemsList;

    @query("pl-item-view")
    private _item: ItemView;

    handleRoute(
        [id]: [string],
        { editing, isNew, addAttachment, vault, tag, favorites, attachments, recent, host }: { [prop: string]: string }
    ) {
        this.filter = {
            vault,
            tag,
            favorites: favorites === "true",
            attachments: attachments === "true",
            recent: recent === "true",
            host: host === "true",
        };
        this.select(id || null, editing === "true", isNew === "true", addAttachment === "true");
    }

    search() {
        this._list.search();
    }

    async select(id: string | null, editing: boolean = false, isNew: boolean = false, addAttachment: boolean = false) {
        await this.updateComplete;
        this.selected = id;
        this._item.isNew = isNew;
        if (editing) {
            setTimeout(() => this._item.edit(), 500);
        }
        if (addAttachment) {
            this._item.addAttachment();
        }
    }

    render() {
        return html`
            <div class="fullbleed pane layout ${!!this.selected ? "open" : ""}">
                <pl-items-list .selected=${this.selected} .filter=${this.filter}></pl-items-list>

                <pl-item-view .itemId=${this.selected}></pl-item-view>
            </div>
        `;
    }
}
