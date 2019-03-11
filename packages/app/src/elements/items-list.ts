import { VaultItem, Field } from "@padloc/core/lib/item.js";
import { ListItem } from "@padloc/core/lib/app.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { wait } from "@padloc/core/lib/util.js";
import { repeat } from "lit-html/directives/repeat.js";
import { cache } from "lit-html/directives/cache.js";
import { setClipboard } from "../clipboard.js";
import { app, router } from "../init.js";
import { dialog, confirm } from "../dialog.js";
import { shared, mixins } from "../styles";
import { element, html, property, query, listen } from "./base.js";
import { View } from "./view.js";
import { CreateItemDialog } from "./create-item-dialog.js";
import { Input } from "./input.js";
import { MoveItemsDialog } from "./move-items-dialog.js";
import "./icon.js";
import "./items-filter.js";

@element("pl-items-list")
export class ItemsList extends View {
    @property()
    selected: string = "";
    @property()
    multiSelect: boolean = false;
    @property()
    private _listItems: ListItem[] = [];
    // @property()
    // private _firstVisibleIndex: number = 0;
    // @property()
    // private _lastVisibleIndex: number = 0;

    // @query("#main")
    // private _main: HTMLElement;
    @query("#filterInput")
    private _filterInput: Input;

    @property()
    private _filterShowing: boolean = false;

    private _cachedBounds: DOMRect | ClientRect | null = null;
    // private _selected = new Map<string, ListItem>();

    @dialog("pl-create-item-dialog")
    private _createItemDialog: CreateItemDialog;

    @dialog("pl-move-items-dialog")
    private _moveItemsDialog: MoveItemsDialog;

    private _multiSelect = new Map<string, ListItem>();

    @listen("items-added", app)
    @listen("items-deleted", app)
    @listen("item-changed", app)
    @listen("items-moved", app)
    @listen("settings-changed", app)
    @listen("vault-changed", app)
    @listen("filter-changed", app)
    _updateListItems() {
        this._listItems = app.items;
        // Clear items from selection that are no longer in list (due to filtering)
        for (const id of this._multiSelect.keys()) {
            if (!this._listItems.some(i => i.item.id === id)) {
                this._multiSelect.delete(id);
            }
        }
    }

    @listen("unlock", app)
    _unlocked() {
        this._updateListItems();
        // this._animateItems(600);
    }

    @listen("lock", app)
    async _locked() {
        await wait(500);
        this._updateListItems();
    }

    @listen("synchronize", app)
    _synchronized() {
        this._updateListItems();
        // this._animateItems();
    }

    private _filterInputBlurred() {
        if (!this._filterInput.value) {
            this._filterShowing = false;
        }
    }

    async search() {
        this._filterShowing = true;
        await this.updateComplete;
        this._filterInput.focus();
    }

    cancelFilter() {
        this._filterInput.value = "";
        this._filterInput.blur();
        this._filterShowing = false;
        this._updateFilter();
    }

    selectItem(item: ListItem) {
        if (this.multiSelect) {
            if (this._multiSelect.has(item.item.id)) {
                this._multiSelect.delete(item.item.id);
            } else {
                this._multiSelect.set(item.item.id, item);
            }
            this.requestUpdate();
        } else {
            router.go(`items/${item.item.id}`);
        }
    }

    selectAll() {
        this.multiSelect = true;
        for (const item of this._listItems) {
            this._multiSelect.set(item.item.id, item);
        }
        this.requestUpdate();
    }

    clearSelection() {
        this._multiSelect.clear();
        this.requestUpdate();
    }

    cancelMultiSelect() {
        this._multiSelect.clear();
        this.multiSelect = false;
        this.requestUpdate();
    }

    firstUpdated() {
        this._resizeHandler();
    }

    render() {
        return html`
            ${shared}

            <style>

                :host {
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                    position: relative;
                    background: var(--color-quaternary);
                    border-radius: var(--border-radius);
                }

                header {
                    overflow: visible;
                    z-index: 10;
                }

                pl-items-filter {
                    flex: 1;
                    min-width: 0;
                }

                main {
                    padding-bottom: 70px;
                }

                .section-header {
                    grid-column: 1/-1;
                    font-weight: bold;
                    display: flex;
                    align-items: flex-end;
                    height: 35px;
                    box-sizing: border-box;
                    padding: 0 10px 5px 10px;
                    background: var(--color-quaternary);
                    display: flex;
                    z-index: 1;
                    position: -webkit-sticky;
                    position: sticky;
                    top: -3px;
                    margin-bottom: -8px;
                    font-size: var(--font-size-small);
                }

                .items {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    grid-gap: var(--gutter-size);
                    padding: 8px;
                    cursor: pointer;
                }

                .item {
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    margin: 0;
                }

                .item-body {
                    flex: 1;
                    min-width: 0;
                }

                .item .tags {
                    padding: 0 8px;
                }

                .item-header {
                    height: var(--row-height);
                    line-height: var(--row-height);
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .item-name {
                    padding-left: 15px;
                    ${mixins.ellipsis()}
                    font-weight: bold;
                    flex: 1;
                    min-width: 0;
                }

                .item-fields {
                    position: relative;
                    display: flex;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }

                .item-fields::after {
                    content: "";
                    display: block;
                    width: 8px;
                    flex: none;
                }

                .item-field {
                    cursor: pointer;
                    font-size: var(--font-size-tiny);
                    line-height: 32px;
                    height: 32px;
                    text-align: center;
                    position: relative;
                    flex: 1;
                    font-weight: bold;
                    margin: 0 0 8px 8px;
                    border-radius: 8px;
                    ${mixins.shade2()}
                }

                .item-field > * {
                    transition: transform 0.2s cubic-bezier(1, -0.3, 0, 1.3), opacity 0.2s;
                }

                .copied-message {
                    ${mixins.fullbleed()}
                    border-radius: inherit;
                }

                .item-field:not(.copied) .copied-message, .item-field.copied .item-field-label {
                    opacity: 0;
                    transform: scale(0);
                }

                .copied-message {
                    font-weight: bold;
                    background: var(--color-primary);
                    color: var(--color-background);
                }

                .copied-message::before {
                    font-family: "FontAwesome";
                    content: "\\f00c\\ ";
                }

                .item-field-label {
                    padding: 0 15px;
                    pointer-events: none;
                    ${mixins.ellipsis()}
                }

                .item:focus:not([selected]) {
                    border-color: var(--color-highlight);
                    color: #4ca8d9;
                }

                .item[selected] {
                    background: #e6e6e6;
                    border-color: #ddd;
                }

                .item-check {
                    position: relative;
                    width: 30px;
                    height: 30px;
                    box-sizing: border-box;
                    border: solid 3px #eee;
                    background: #eee;
                    border-radius: 30px;
                    margin: 10px;
                    margin-right: 5px;
                }

                .item-check::after {
                    content: "";
                    display: block;
                    ${mixins.fullbleed()}
                    background: var(--color-primary);
                    border-radius: inherit;
                    transition: transform 0.2s, opacity 0.2s;
                    transition-timing-function: cubic-bezier(1, -0.3, 0, 1.3);
                }

                .item-check:not([checked])::after {
                    opacity: 0;
                    transform: scale(0);
                }

                .selected-count {
                    text-align: center;
                    display: block;
                    margin-left: 12px;
                    background: #eee;
                    border-radius: var(--border-radius);
                    padding: 12px 4px;
                    line-height: 1.2em;
                    font-size: var(--font-size-tiny);
                    font-weight: bold;
                    box-shadow: rgba(0, 0, 0, 0.3) 0px 0px 4px;
                }
            </style>

            <header ?hidden=${this._filterShowing}>
                <pl-icon icon="menu" class="tap menu-button" @click=${() => this.dispatch("toggle-menu")}></pl-icon>

                <pl-items-filter></pl-items-filter>

                <pl-icon icon="search" class="tap" @click=${() => this.search()}></pl-icon>
            </header>

            <header ?hidden=${!this._filterShowing}>
                <pl-icon icon="search"></pl-icon>

                <pl-input
                    class="flex"
                    .placeholder=${$l("Type To Filter")}
                    id="filterInput"
                    @blur=${this._filterInputBlurred}
                    @input=${this._updateFilter}
                    @escape=${this.cancelFilter}
                >
                </pl-input>

                <pl-icon class="tap" icon="cancel" @click=${() => this.cancelFilter()}> </pl-icon>
            </header>

            <main id="main">
                <div class="items">
                    ${repeat(this._listItems, item => item.id, (_: any, index: number) => this._renderItem(index))}
                </div>
            </main>

            <div class="empty-placeholder" ?hidden=${!!this._listItems.length || app.filter.text}>
                <pl-icon icon="list"></pl-icon>

                <div>${$l("You don't have any items yet!")}</div>
            </div>

            <div class="empty-placeholder" ?hidden=${!!this._listItems.length || !app.filter.text}>
                <pl-icon icon="search"></pl-icon>

                <div>${$l("Your search did not match any items.")}</div>
            </div>

            <div class="fabs" ?hidden=${this.multiSelect}>
                <pl-icon icon="checked" class="tap fab" @click=${() => this.selectAll()}></pl-icon>

                <div class="flex"></div>

                <pl-icon icon="add" class="tap fab primary" @click=${() => this._newItem()}></pl-icon>
            </div>

            <div class="fabs" ?hidden=${!this.multiSelect}>
                <pl-icon
                    icon="checkall"
                    class="tap fab"
                    @click=${() => (this._multiSelect.size ? this.clearSelection() : this.selectAll())}
                >
                </pl-icon>

                <pl-icon icon="cancel" class="tap fab" @click=${() => this.cancelMultiSelect()}></pl-icon>

                <div class="flex selected-count">${$l("{0} items selected", this._multiSelect.size.toString())}</div>

                <pl-icon icon="share" class="tap fab" @click=${() => this._moveItems()}></pl-icon>

                <pl-icon icon="delete" class="tap fab destructive" @click=${() => this._deleteItems()}></pl-icon>
            </div>
        `;
    }

    _updateFilter() {
        app.filter = { text: this._filterInput.value };
    }

    @listen("resize", window)
    _resizeHandler() {
        delete this._cachedBounds;
    }

    private async _newItem() {
        const item = await this._createItemDialog.show();
        if (item) {
            router.go(`items/${item.id}?edit`);
        }
    }
    //
    // private _scrollToIndex(i: number) {
    //     const el = this.$(`pl-item-item[index="${i}"]`);
    //     if (el) {
    //         this._main.scrollTop = el.offsetTop - 6;
    //     }
    // }
    //
    // private _scrollToSelected() {
    //     const selected = this._selected.values()[0];
    //     const i = this._listItems.indexOf(selected);
    //     if (i !== -1 && (i < this._firstVisibleIndex || i > this._lastVisibleIndex)) {
    //         this._scrollToIndex(i);
    //     }
    // }
    //
    // private _fixScroll() {
    //     // Workaround for list losing scrollability on iOS after resetting filter
    //     isIOS().then(yes => {
    //         if (yes) {
    //             this._main.style.overflow = "hidden";
    //             setTimeout(() => (this._main.style.overflow = "auto"), 100);
    //         }
    //     });
    // }

    // private async _animateItems(delay = 100) {
    //     await this.updateComplete;
    //     this._main.style.opacity = "0";
    //     setTimeout(() => {
    //         this._scrollHandler();
    //         const elements = Array.from(this.$$(".list-item"));
    //         const animated = elements.slice(this._firstVisibleIndex, this._lastVisibleIndex + 1);
    //
    //         animateCascade(animated, { clear: true });
    //         this._main.style.opacity = "1";
    //     }, delay);
    // }

    private async _deleteItems() {
        const confirmed = await confirm(
            $l("Are you sure you want to delete these items? This action can not be undone!"),
            $l("Delete {0} Items", this._multiSelect.size.toString()),
            $l("Cancel"),
            { type: "destructive" }
        );
        if (confirmed) {
            await app.deleteItems([...this._multiSelect.values()]);
            this.cancelMultiSelect();
        }
    }

    private async _moveItems() {
        const movedItems = await this._moveItemsDialog.show([...this._multiSelect.values()]);
        if (movedItems) {
            this.cancelMultiSelect();
        }
    }

    private _copyField(item: VaultItem, index: number, e: Event) {
        e.stopPropagation();
        setClipboard(item, item.fields[index]);
        const fieldEl = e.target as HTMLElement;
        fieldEl.classList.add("copied");
        setTimeout(() => fieldEl.classList.remove("copied"), 1000);
    }

    private _renderItem(index: number) {
        const item = this._listItems[index];

        const tags = [];

        const vaultName = item.vault.toString();
        tags.push({ name: vaultName, icon: "", class: "highlight" });

        if (item.warning) {
            tags.push({ icon: "error", class: "tag warning", name: "" });
        }

        const t = item.item.tags.find(t => t === app.filter.tag) || item.item.tags[0];
        if (t) {
            tags.push({
                name: item.item.tags.length > 1 ? `${t} (+${item.item.tags.length - 1})` : t,
                icon: "",
                class: ""
            });
        }

        const attCount = (item.item.attachments && item.item.attachments.length) || 0;
        if (attCount) {
            tags.push({
                name: "",
                icon: "attachment",
                class: ""
            });
        }

        return html`
            ${cache(
                item.firstInSection
                    ? html`
                          <div class="section-header" ?hidden=${!item.firstInSection}>
                              <div>${item.section}</div>

                              <div class="spacer"></div>

                              <div>${item.section}</div>
                          </div>
                      `
                    : html``
            )}

            <div
                class="item"
                ?selected=${item.item.id === this.selected}
                @click=${() => this.selectItem(item)}
                index="${index}"
            >
                <div
                    class="item-check"
                    ?hidden=${!this.multiSelect}
                    ?checked=${this._multiSelect.has(item.item.id)}
                ></div>

                <div class="item-body">
                    <div class="item-header">
                        <div class="item-name" ?disabled=${!item.item.name}>
                            ${item.item.name || $l("No Name")}
                        </div>

                        <div class="tags small">
                            ${tags.map(tag =>
                                tag.icon
                                    ? html`
                                          <div class="tag ${tag.class}">
                                              <pl-icon icon="${tag.icon}"></pl-icon>
                                          </div>
                                      `
                                    : html`
                                          <div class="ellipsis tag ${tag.class}">${tag.name}</div>
                                      `
                            )}
                        </div>
                    </div>

                    <div class="item-fields">
                        ${item.item.fields.map(
                            (f: Field, i: number) => html`
                                <div class="item-field" @click=${(e: MouseEvent) => this._copyField(item.item, i, e)}>
                                    <div class="item-field-label">${f.name}</div>

                                    <div class="copied-message">${$l("copied")}</div>
                                </div>
                            `
                        )}

                        <div class="item-field" disabled ?hidden=${!!item.item.fields.length}>
                            ${$l("No Fields")}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
