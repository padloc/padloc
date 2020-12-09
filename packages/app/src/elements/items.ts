import { element, html, css, query, property } from "./base";
import { View } from "./view";
import { StateMixin } from "../mixins/state";
import { ItemsList } from "./items-list";
import { ItemView } from "./item-view";

@element("pl-items")
export class ItemsView extends StateMixin(View) {
    @property()
    selected: string | null = null;

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

    static styles = [
        ...View.styles,
        css`
            :host {
                background: var(--color-background);
            }

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
                <pl-items-list .selected=${this.selected}></pl-items-list>
                <pl-item-view class="stretch" .itemId=${this.selected}></pl-item-view>
            </div>
        `;
    }
}
