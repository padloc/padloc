import { element, html, query, property } from "./base";
import { View } from "./view";
import { StateMixin } from "../mixins/state";
import { ItemsList, ItemsFilter } from "./items-list";
import { ItemView } from "./item-view";

@element("pl-items")
export class ItemsView extends StateMixin(View) {
    @property()
    selected: string | null = null;

    @property()
    filter?: ItemsFilter;

    @query("pl-items-list")
    private _list: ItemsList;

    @query("pl-item-view")
    private _item: ItemView;

    search() {
        this._list.search();
    }

    select(id: string | null, editing: boolean = false, isNew: boolean = false, addAttachment: boolean = false) {
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
