import { shared, listLayout } from "../styles";
import { element, property, query, listen, html } from "./base.js";
import { app, router } from "../init.js";
import { View } from "./view.js";
import { BrowseList } from "./browse-list.js";
import { ItemView } from "./item-view.js";

@element("pl-browse")
export class Browse extends View {
    @property()
    selected: string = "";

    @query("pl-browse-list")
    private _list: BrowseList;

    @query("pl-item-view")
    private _itemView: ItemView;

    @listen("item-created", app)
    _itemCreated(e: CustomEvent) {
        router.go(`items/${e.detail.item.id}`);
        setTimeout(() => {
            this._itemView.edit();
        }, 200);
    }

    search() {
        this._list.search();
    }

    render() {
        return html`
            ${shared}
            ${listLayout}

            <div class="list-layout" ?show-detail=${!!this.selected}>

                <pl-browse-list .selected=${this.selected}></pl-browse-list>

                <pl-item-view .selected=${this.selected}></pl-item-view>

            </div>
        `;
    }
}
