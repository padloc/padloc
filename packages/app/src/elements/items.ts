import { element, html, css, query, property } from "./base";
import { View } from "./view";
import { StateMixin } from "../mixins/state";
import { ItemsList, ItemsFilter } from "./items-list";
import { ItemView } from "./item-view";
import { mixins } from "../styles";

@element("pl-items")
export class ItemsView extends StateMixin(View) {
    @property({ reflect: true })
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

            @media (max-width: 700px) {
                pl-items-list {
                    max-width: unset;
                    border: none;
                    will-change: transform;
                    transition: transform 0.3s;
                }

                pl-item-view {
                    ${mixins.fullbleed()};
                    z-index: 1;
                    will-change: transform;
                    transition: transform 0.3s;
                    box-shadow: rgba(0, 0, 0, 0.3) -1px 0 6px -3px;
                }

                :host([selected]) pl-items-list {
                    transform: translateX(-50%);
                }

                :host(:not([selected])) pl-item-view {
                    transform: translateX(calc(100% + 6px));
                }
            }
        `,
    ];

    render() {
        return html`
            <div class="fullbleed horizontal layout">
                <pl-items-list .selected=${this.selected} .filter=${this.filter}></pl-items-list>

                <pl-item-view
                    class="stretch ${!!this.selected ? "showing" : ""}"
                    .itemId=${this.selected}
                ></pl-item-view>
            </div>
        `;
    }
}
