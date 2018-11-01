import { when } from "lit-html/directives/when.js";
import { Record, Field } from "@padlock/core/lib/data.js";
import { Vault } from "@padlock/core/lib/vault.js";
import { ListItem } from "@padlock/core/lib/app.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
// import { isIOS } from "@padlock/core/lib/platform.js";
import { wait } from "@padlock/core/lib/util.js";
import { animateCascade } from "../animation.js";
import { setClipboard } from "../clipboard.js";
import { app, router } from "../init.js";
import { confirm, getDialog } from "../dialog.js";
import { shared, mixins } from "../styles";
import { BaseElement, element, html, property, query, listen } from "./base.js";
import { ShareDialog } from "./share-dialog.js";
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
    private _lastScrollTop: number = 0;

    private get _selectedRecords() {
        return [...this._selected.values()].map((item: ListItem) => item.record);
    }

    @listen("records-added", app)
    @listen("records-deleted", app)
    @listen("record-changed", app)
    @listen("settings-changed", app)
    @listen("vault-changed", app)
    @listen("filter-changed", app)
    _updateListItems() {
        this._listItems = app.items;
    }

    @listen("record-created", app)
    _recordCreated(e: CustomEvent) {
        this._updateListItems();
        const item = this._listItems.find(item => item.record.id === e.detail.record.id);
        if (item) {
            this.selectItem(item);
        }
    }

    @listen("unlock", app)
    _unlocked() {
        this._updateListItems();
        this._animateItems(600);
    }

    @listen("lock", app)
    async _locked() {
        await wait(500);
        this._updateListItems();
    }

    @listen("synchronize", app)
    _synchronized() {
        this._updateListItems();
        this._animateItems();
    }

    clearFilter() {
        this._filterInput.value = "";
        this._updateFilter();
        this._scrollHandler();
    }

    selectItem(item: ListItem) {
        if (this.multiSelect) {
            if (this._selected.has(item.record.id)) {
                this._selected.delete(item.record.id);
            } else {
                this._selected.set(item.record.id, item);
            }
        } else {
            this._selected.clear();
            this._selected.set(item.record.id, item);
            this._scrollToSelected();
            router.go(`browse/${item.record.id}`);
        }
        this.requestUpdate();
    }

    selectAll() {
        this.multiSelect = true;
        for (const item of this._listItems) {
            this._selected.set(item.record.id, item);
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
                box-sizing: border-box;
                height: 100%;
                position: relative;
                background: var(--color-quaternary);
            }

            #main {
                padding-top: 56px;
            }

            .filter-wrapper {
                display: flex;
                font-size: var(--font-size-small);
                height: 40px;
                position: absolute;
                top: 8px;
                left: 8px;
                right: 8px;
                background: var(--color-tertiary);
                border: solid 1px #eee;
                border-radius: 20px;
                z-index: 2;
                overflow: hidden;
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
                top: -56px;
                z-index: 1;
                display: flex;
                height: 35px;
                line-height: 35px;
                padding: 0 15px;
                font-size: var(--font-size-tiny);
                font-weight: bold;
                margin-bottom: -5px;
                border-bottom: solid 1px #eee;
                background: var(--color-quaternary);
            }

            .multi-select {
                background: var(--color-background);
                height: var(--row-height);
                border-top: solid 1px rgba(0, 0, 0, 0.2);
                display: flex;
            }

            .multi-select > pl-icon {
                width: var(--row-height);
                height: var(--row-height);
            }

            .multi-select-count {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: var(--font-size-small);
                font-weight: bold;
                overflow: hidden;
                text-align: center;
            }

            .record {
                display: block;
                cursor: pointer;
                vertical-align: top;
                box-sizing: border-box;
                flex-direction: row;
                position: relative;
                background: var(--color-background);
                margin-top: 4px;
                border-top: solid 1px #eee;
                border-bottom: solid 1px #eee;
            }

            .record .tags {
                padding: 0 8px;
            }

            .record-header {
                height: var(--row-height);
                line-height: var(--row-height);
                position: relative;
                display: flex;
                align-items: center;
            }

            .record-name {
                padding-left: 15px;
                ${mixins.ellipsis()}
                font-weight: bold;
                flex: 1;
                width: 0;
            }

            .record-fields {
                position: relative;
                display: flex;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
            }

            .record-fields::after {
                content: "";
                display: block;
                width: 6px;
                flex: none;
            }

            .record-field {
                cursor: pointer;
                font-size: var(--font-size-tiny);
                line-height: 35px;
                height: 35px;
                text-align: center;
                position: relative;
                flex: 1;
                font-weight: bold;
                margin: 0 0 8px 8px;
                border-radius: 8px;
                ${mixins.shade2()}
            }

            .record-field > * {
                transition: transform 0.2s cubic-bezier(1, -0.3, 0, 1.3), opacity 0.2s;
            }

            .copied-message {
                ${mixins.fullbleed()}
                border-radius: inherit;
            }

            .record-field:not(.copied) .copied-message, .record-field.copied .record-field-label {
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

            :host(:not([multi-select])) .record-field:hover {
                ${mixins.shade3()}
            }

            .record-field-label {
                padding: 0 15px;
                pointer-events: none;
                ${mixins.ellipsis()}
            }

            .record:focus:not([selected]) {
                border-color: var(--color-highlight);
                color: #4ca8d9;
            }

            .record[selected] {
                background: #e6e6e6;
                border-color: #ddd;
            }

            .add-icon {
                border-radius: 100%;
                position: absolute;
                z-index: 2;
                bottom: 10px;
                right: 10px;
                background: var(--color-secondary);
                color: var(--color-tertiary);
            }
        </style>

        <div class="filter-wrapper">

            <pl-icon icon="search"></pl-icon>

            <pl-input
                class="flex"
                .placeholder=${$l("Type To Filter")}
                id="filterInput"
                @input=${() => this._updateFilter()}
                @escape=${() => this.clearFilter()}>
            </pl-input>

            <pl-icon
                class="tap"
                icon="cancel"
                ?invisible=${!app.filter.text}
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

        <pl-icon icon="add" class="add-icon"></pl-icon>
`;
    }

    _updateFilter() {
        app.filter = { text: this._filterInput.value, vault: app.filter.vault, tag: app.filter.tag };
    }

    @listen("resize", window)
    _resizeHandler() {
        delete this._cachedBounds;
    }

    private get _bounds(): DOMRect | ClientRect | null {
        if (this._main && !this._cachedBounds) {
            this._cachedBounds = this._main.getBoundingClientRect();
        }
        return this._cachedBounds;
    }

    @listen("scroll", "#main")
    _scrollHandler() {
        const st = this._main.scrollTop;
        const scrollingUp = this._lastScrollTop > st;
        this._lastScrollTop = st;

        const pos = scrollingUp || this._filterInput.focused || this._filterInput.value ? 0 : Math.max(-st, -60);
        this._filterWrapper.style.transform = `translate(0, ${pos}px)`;
        this._filterWrapper.style.transition = scrollingUp || st > 56 ? "transform 0.2s" : "none";
    }

    private _newRecord() {
        app.createRecord("");
    }

    private _scrollToIndex(i: number) {
        const el = this.$(`pl-record-item[index="${i}"]`);
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

    private async _animateItems(delay = 100) {
        await this.updateComplete;
        this._main.style.opacity = "0";
        setTimeout(() => {
            this._scrollHandler();
            const elements = Array.from(this.$$(".list-item"));
            const animated = elements.slice(this._firstVisibleIndex, this._lastVisibleIndex + 1);

            animateCascade(animated, { clear: true });
            this._main.style.opacity = "1";
        }, delay);
    }

    private async _shareSelected() {
        for (const [id, item] of this._selected.entries()) {
            if (item.vault !== app.mainVault) {
                this._selected.delete(id);
            }
        }
        this.requestUpdate();
        const shareDialog = getDialog("pl-share-dialog") as ShareDialog;
        await shareDialog.show(this._selectedRecords);
        this.clearSelection();
    }

    private async _deleteSelected() {
        const confirmed = await confirm(
            $l("Are you sure you want to delete these records? This action can not be undone!"),
            $l("Delete {0} Records", this._selectedRecords.length.toString())
        );
        if (confirmed) {
            const vaults = new Map<Vault, Record[]>();
            for (const item of this._selected.values()) {
                if (!vaults.has(item.vault)) {
                    vaults.set(item.vault, []);
                }
                vaults.get(item.vault)!.push(item.record);
            }
            await Promise.all([...vaults.entries()].map(([vault, records]) => app.deleteRecords(vault, records)));
            this.multiSelect = false;
        }
    }

    private _copyField(record: Record, index: number, e: Event) {
        e.stopPropagation();
        setClipboard(record, record.fields[index]);
        const fieldEl = e.target as HTMLElement;
        fieldEl.classList.add("copied");
        setTimeout(() => fieldEl.classList.remove("copied"), 1000);
    }

    private _renderItem(index: number) {
        const item = this._listItems[index];

        // const tags = [{ name: "", class: "warning", icon: "org" }];
        const tags = [];

        const vaultName = item.vault.parent ? `${item.vault.parent.name}/${item.vault.name}` : item.vault.name;
        tags.push({ name: vaultName, icon: "vault", class: "highlight" });

        if (item.warning) {
            tags.push({ icon: "error", class: "tag warning", name: "" });
        }

        const t = item.record.tags.find(t => t === app.filter.tag) || item.record.tags[0];
        if (t) {
            tags.push({
                name: item.record.tags.length > 1 ? `${t} (+${item.record.tags.length - 1})` : t,
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

                <div class="record"
                    .record=${item.record}
                    record-id="${item.record.id}"
                    ?selected=${this._selected.has(item.record.id)}
                    @click=${() => this.selectItem(item)}
                    index="${index}">

                        <div class="record-header">

                            <div class="record-name" ?disabled=${!item.record.name}>
                                ${item.record.name || $l("No Name")}
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

                        <div class="record-fields">

                            ${item.record.fields.map(
                                (f: Field, i: number) => html`
                                    <div
                                        class="record-field"
                                        @click=${(e: MouseEvent) => this._copyField(item.record, i, e)}>

                                        <div class="record-field-label">${f.name}</div>

                                        <div class="copied-message">${$l("copied")}</div>

                                    </div>
                                `
                            )}

                            <div class="record-field" disabled ?hidden=${!!item.record.fields.length}>
                                ${$l("No Fields")}
                            </div>

                        </div>

                </div>
        `;
    }
}
