import { element, html, css, query, property } from "./base";
import { View } from "./view";
import { StateMixin } from "../mixins/state";
import { ItemsList } from "./items-list";
// import { ItemView } from "./item-view";
import "./item-view";

@element("pl-items")
export class ItemsView extends StateMixin(View) {
    @property()
    selected: string = "";

    @query("pl-items-list")
    private _list: ItemsList;

    // @query("pl-item-view")
    // private _item: ItemView;

    search() {
        this._list.search();
    }

    static styles = [
        ...View.styles,
        css`
            pl-items-list {
                width: 100%;
                max-width: 25em;
                border-right: solid 1px var(--border-color);
            }
        `,
    ];

    render() {
        return html`
            <div class="fullbleed horizontal layout">
                <pl-items-list></pl-items-list>
                <pl-item-view class="stretch" .itemId=${this.selected}></pl-item-view>
            </div>
        `;
    }
}
