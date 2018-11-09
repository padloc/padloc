import { when } from "lit-html/directives/when.js";
import { Field } from "@padlock/core/lib/data.js";
import { Vault } from "@padlock/core/lib/vault.js";
import { VaultItem } from "@padlock/core/lib/data.js";
import { ListItem } from "@padlock/core/lib/app.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { wait } from "@padlock/core/lib/util.js";
import { setClipboard } from "../clipboard.js";
import { app, router } from "../init.js";
import { confirm, dialog, getDialog } from "../dialog.js";
import { shared, mixins } from "../styles";
import { BaseElement, element, html, property, query, listen } from "./base.js";
import { ShareDialog } from "./share-dialog.js";
import { CreateItemDialog } from "./create-item-dialog.js";
import { Input } from "./input.js";
import "./share-dialog.js";

@element("pl-browse-list")
export class BrowseList extends BaseElement {
    @property()
    multiSelect: boolean = false;
    @property()
    private _listItems: ListItem[] = [];
    @property()
    private _firstVisibleIndex: number = 0;
    @property()
    private _lastVisibleIndex: number = 0;

    @query("#main")
    private _main: HTMLElement;
    @query("#filterInput")
    private _filterInput: Input;
    @query(".filter-wrapper")
    private _filterWrapper: HTMLDivElement;

    private _cachedBounds: DOMRect | ClientRect | null = null;
    private _selected = new Map<string, ListItem>();

    @dialog("pl-create-item-dialog")
    private _createItemDialog: CreateItemDialog;

    private get _selectedItems() {
        return [...this._selected.values()].map((item: ListItem) => item.item);
    }

    @listen("items-added", app)
    @listen("items-deleted", app)
    @listen("item-changed", app)
    @listen("settings-changed", app)
    @listen("vault-changed", app)
    @listen("filter-changed", app)
    _updateListItems() {
        this._listItems = app.items;
        this._toggleFilterInput();
    }

    @listen("item-created", app)
    _itemCreated(e: CustomEvent) {
        this._updateListItems();
        const item = this._listItems.find(item => item.item.id === e.detail.item.id);
        if (item) {
            this.selectItem(item);
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

    search() {
        this._filterInput.focus();
    }

    clearFilter() {
        this._filterInput.value = "";
        this._updateFilter();
        // this._scrollHandler();
    }

    selectItem(item: ListItem) {
        if (this.multiSelect) {
            if (this._selected.has(item.item.id)) {
                this._selected.delete(item.item.id);
            } else {
                this._selected.set(item.item.id, item);
            }
        } else {
            this._selected.clear();
            this._selected.set(item.item.id, item);
            this._scrollToSelected();
            router.go(`items/${item.item.id}`);
        }
        this.requestUpdate();
    }

    selectAll() {
        this.multiSelect = true;
        for (const item of this._listItems) {
            this._selected.set(item.item.id, item);
        }
        this.requestUpdate();
    }

    clearSelection() {
        this._selected.clear();
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
                height: 100%;
                position: relative;
                background: var(--color-quaternary);
            }

            header {
                overflow: visible;
                z-index: 10;
            }

            pl-browse-filter {
                flex: 1;
                width: 0;
            }

            .filter-wrapper {
                display: flex;
                font-size: var(--font-size-small);
                height: 40px;
                position: absolute;
                top: 50px;
                left: 0;
                right: 0;
                background: var(--color-secondary);
                color: var(--color-tertiary);
                z-index: 2;
                overflow: hidden;
                transition: transform 0.2s;
            }

            .filter-wrapper pl-input {
                font-size: inherit;
                padding: 0;
                height: 40px;
                line-height: 40px;
                text-align: center;
            }

            .empty{
                ${mixins.fullbleed()}
                display: flex;
                flex-direction: column;
                ${mixins.fullbleed()}
                top: var(--row-height);
                overflow: visible;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 20px;
            }

            .empty pl-icon {
                width: 100px;
                height: 100px;
                font-size: 60px;
            }

            .section-header {
                position: sticky;
                top: 0;
                background: #fafafa;
                z-index: 1;
                display: flex;
                height: 40px;
                line-height: 40px;
                padding: 0 15px;
                font-size: var(--font-size-tiny);
                font-weight: bold;
                border-bottom: solid 1px #ddd;
                box-sizing: border-box;
            }

            .item {
                display: block;
                cursor: pointer;
                vertical-align: top;
                box-sizing: border-box;
                flex-direction: row;
                background: var(--color-background);
                border-bottom: solid 1px #ddd;
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
                width: 0;
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
                width: 6px;
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
        </style>

        <header>

            <pl-icon icon="menu" class="tap menu-button" @click=${() => this.dispatch("toggle-menu")}></pl-icon>

            <pl-browse-filter></pl-browse-filter>

            <pl-icon icon="search" class="tap" @click=${() => this.search()}></pl-icon>

        </header>

        <div class="filter-wrapper">

            <pl-icon icon="search"></pl-icon>

            <pl-input
                class="flex"
                .placeholder=${$l("Type To Filter")}
                id="filterInput"
                @focus=${() => this._toggleFilterInput()}
                @blur=${() => this._toggleFilterInput()}
                @input=${() => this._updateFilter()}
                @escape=${() => this.clearFilter()}>
            </pl-input>

            <pl-icon
                class="tap"
                icon="cancel"
                @click=${() => this.clearFilter()}>
            </pl-icon>

        </div>

        <main id="main">

            ${this._listItems.map((_: any, index: number) => this._renderItem(index))}

        </main>

        <div class="empty" ?hidden=${!!this._listItems.length || app.filter.text}>

            <pl-icon icon="logo"></pl-icon>

            <div>${$l("You don't have any items yet!")}</div>

        </div>

        <div class="empty" ?hidden=${!!this._listItems.length || !app.filter.text}>

            <pl-icon icon="search"></pl-icon>

            <div>${$l("Your search did not match any items.")}</div>

        </div>

        <pl-icon icon="add" class="tap fab" @click=${() => this._newItem()}></pl-icon>
`;
    }

    _updateFilter() {
        app.filter = { text: this._filterInput.value, vault: app.filter.vault, tag: app.filter.tag };
        this._toggleFilterInput();
    }

    _toggleFilterInput() {
        const pos = this._filterInput.focused || this._filterInput.value ? 0 : -60;
        this._filterWrapper.style.transform = `translate(0, ${pos}px)`;
    }

    @listen("resize", window)
    _resizeHandler() {
        delete this._cachedBounds;
    }

    private _newItem() {
        this._createItemDialog.show();
    }

    private _scrollToIndex(i: number) {
        const el = this.$(`pl-item-item[index="${i}"]`);
        if (el) {
            this._main.scrollTop = el.offsetTop - 6;
        }
    }

    private _scrollToSelected() {
        const selected = this._selected.values()[0];
        const i = this._listItems.indexOf(selected);
        if (i !== -1 && (i < this._firstVisibleIndex || i > this._lastVisibleIndex)) {
            this._scrollToIndex(i);
        }
    }
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

    private async _shareSelected() {
        for (const [id, item] of this._selected.entries()) {
            if (item.vault !== app.mainVault) {
                this._selected.delete(id);
            }
        }
        this.requestUpdate();
        const shareDialog = getDialog("pl-share-dialog") as ShareDialog;
        await shareDialog.show(this._selectedItems);
        this.clearSelection();
    }

    private async _deleteSelected() {
        const confirmed = await confirm(
            $l("Are you sure you want to delete these items? This action can not be undone!"),
            $l("Delete {0} Items", this._selectedItems.length.toString())
        );
        if (confirmed) {
            const vaults = new Map<Vault, Item[]>();
            for (const item of this._selected.values()) {
                if (!vaults.has(item.vault)) {
                    vaults.set(item.vault, []);
                }
                vaults.get(item.vault)!.push(item.item);
            }
            await Promise.all([...vaults.entries()].map(([vault, items]) => app.deleteItems(vault, items)));
            this.multiSelect = false;
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

        // const tags = [{ name: "", class: "warning", icon: "org" }];
        const tags = [];

        const vaultName = item.vault.toString();
        tags.push({ name: vaultName, icon: "vault", class: "highlight" });

        if (item.warning) {
            tags.push({ icon: "error", class: "tag warning", name: "" });
        }

        const t = item.item.tags.find(t => t === app.filter.tag) || item.item.tags[0];
        if (t) {
            tags.push({
                name: item.item.tags.length > 1 ? `${t} (+${item.item.tags.length - 1})` : t,
                icon: "tag",
                class: ""
            });
        }

        return html`

            ${when(
                item.firstInSection,
                () => html`
                    <div class="section-header">

                        <div>${item.section}</div>

                        <div class="spacer"></div>

                        <div>${item.section}</div>

                    </div>`,
                () => ""
            )}

                <div class="item"
                    ?selected=${this._selected.has(item.item.id)}
                    @click=${() => this.selectItem(item)}
                    index="${index}">

                        <div class="item-header">

                            <div class="item-name" ?disabled=${!item.item.name}>
                                ${item.item.name || $l("No Name")}
                            </div>

                            <div class="tags small">
                                ${tags.map(
                                    tag => html`
                                        <div class="ellipsis tag ${tag.class}">
                                            <pl-icon icon=${tag.icon}></pl-icon>
                                            <div>${tag.name}</div>
                                        </div>
                                    `
                                )}
                            </div>

                        </div>

                        <div class="item-fields">

                            ${item.item.fields.map(
                                (f: Field, i: number) => html`
                                    <div
                                        class="item-field"
                                        @click=${(e: MouseEvent) => this._copyField(item.item, i, e)}>

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
        `;
    }
}
