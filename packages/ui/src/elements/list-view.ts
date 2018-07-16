import { Store, Record, Field } from "@padlock/core/lib/data.js";
import { ListItem } from "@padlock/core/lib/app.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
// import { isIOS } from "@padlock/core/lib/platform.js";
import { wait } from "@padlock/core/lib/util.js";
import { animateCascade } from "../animation.js";
import { setClipboard } from "../clipboard.js";
import { app } from "../init.js";
// import { confirm } from "../dialog.js";
import sharedStyles from "../styles/shared.js";
import { AlertDialog } from "./alert-dialog.js";
import { BaseElement, html, property, query, listen } from "./base.js";
import "./icon.js";
import { Input } from "./input.js";

export class ListView extends BaseElement {
    @property() store?: Store;
    @property() multiSelect: boolean = false;
    @property() filterString: string = "";
    @property() selectedItem: ListItem | null = null;
    @property() selectedItems: ListItem[] = [];
    @property() private _listItems: ListItem[] = [];
    @property() private _currentSection: string = "";
    @property() private _firstVisibleIndex: number = 0;
    @property() private _lastVisibleIndex: number = 0;

    @query("main") private _main: HTMLDivElement;
    @query("#sectionSelector") private _sectionSelector: AlertDialog;
    @query("#filterInput") private _filterInput: Input;

    private _cachedBounds: DOMRect | ClientRect | null = null;

    @listen("records-added", app)
    @listen("records-deleted", app)
    @listen("record-changed", app)
    _updateListItems() {
        this._listItems = app.list(this.filterString);
    }

    @listen("record-created", app)
    _recordCreated(e: CustomEvent) {
        this._updateListItems();
        const item = this._listItems.find(item => item.record.id === e.detail.record.id);
        this.selectItem(item || null);
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

    _didRender() {
        this._resizeHandler();
    }

    _render(props: this) {
        const filterActive = !!props.filterString;
        return html`
        <style>
            ${sharedStyles}

            :host {
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                height: 100%;
                position: relative;
                background: var(--color-quaternary);
            }

            .filter-input {
                flex: 1;
                padding-left: 15px;
            }

            .filter-input:not([active]) {
                text-align: center;
            }

            header {
                --color-background: var(--color-primary);
                --color-foreground: var(--color-tertiary);
                --color-highlight: var(--color-secondary);
                color: var(--color-foreground);
                text-shadow: rgba(0, 0, 0, 0.2) 0 2px 0;
                border-bottom: none;
                background: linear-gradient(90deg, #59c6ff 0%, #077cb9 100%);
            }

            header pl-icon[icon=logo] {
                font-size: 140%;
            }

            .empty {
                @apply --fullbleed;
                display: flex;
                flex-direction: column;
                @apply --fullbleed;
                top: var(--row-height);
                z-index: 1;
                overflow: visible;
            }

            .empty-message {
                padding: 15px 20px;
                text-align: center;
                position: relative;
                background: var(--color-background);
                border-bottom: solid 1px rgba(0, 0, 0, 0.1);
            }

            .empty-message::before {
                content: "";
                display: block;
                width: 15px;
                height: 15px;
                position: absolute;
                top: -7px;
                right: 18px;
                margin: 0 auto;
                transform: rotate(45deg);
                background: var(--color-background);
                pointer-events: none;
            }

            .cloud-icon-wrapper {
                position: relative;
            }

            header pl-icon.syncing-icon {
                position: absolute;
                font-size: 55%;
                top: 1px;
                left: 0px;
                color: var(--color-highlight);
                text-shadow: none;
                animation: spin 1s infinite;
                transform-origin: center 49%;
            }

            .current-section {
                height: 35px;
                line-height: 35px;
                padding: 0 15px;
                width: 100%;
                box-sizing: border-box;
                font-size: var(--font-size-tiny);
                font-weight: bold;
                cursor: pointer;
                background: var(--color-foreground);
                color: var(--color-background);
            }

            .current-section pl-icon {
                float: right;
                height: 35px;
                width: 10px;
            }

            .section-separator {
                height: 6px;
            }

            .section-header {
                display: flex;
                height: 35px;
                line-height: 35px;
                padding: 0 15px;
                font-size: var(--font-size-tiny);
                font-weight: bold;
                box-sizing: border-box;
            }

            #sectionSelector {
                --row-height: 40px;
                --font-size-default: var(--font-size-small);
                --pl-dialog-inner: {
                    background: var(--color-secondary);
                };
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
                /* transition: color 0.3s; */
                margin: 6px 6px 0 6px;
                /* transform: translate3d(0, 0, 0); */
                @apply --card;
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
                @apply --ellipsis;
                font-weight: bold;
                /* min-width: 150px; */
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
                margin: 0 0 6px 6px;
                border-radius: 8px;
                @apply --shade-2;
            }

            .record-field > * {
                transition: transform 0.2s cubic-bezier(1, -0.3, 0, 1.3), opacity 0.2s;
            }

            .copied-message {
                @apply --fullbleed;
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
                @apply --shade-3;
            }

            .record-field-label {
                padding: 0 15px;
                pointer-events: none;
                @apply --ellipsis;
            }

            .record-tags {
                display: flex;
                align-items: center;
                padding-right: 8px;
            }

            .record-tag {
                font-size: 12px;
                max-width: 60px;
                border-radius: 6px;
                padding: 4px 7px;
                margin-right: 4px;
                line-height: normal;
                font-weight: bold;
                background: var(--color-foreground);
                color: var(--color-background);
            }

            .record-tag.store-tag {
                background: linear-gradient(90deg, #59c6ff 0%, #077cb9 100%);
            }

            .record-highlight {
                content: "";
                display: block;
                background: linear-gradient(90deg, #59c6ff 0%, #077cb9 100%);
                transition-property: opacity, transform;
                transition-duration: 0.2s;
                transition-timing-function: cubic-bezier(0.6, 0, 0.2, 1);
                @apply --fullbleed;
                transform: scale(1, 0);
                opacity: 0;
                border-radius: 5px;
            }

            .record[selected] {
                color: var(--color-background);
            }

            .record:focus:not([selected]) {
                border-color: var(--color-highlight);
                color: #4ca8d9;
            }

            .record[selected] .record-highlight {
                transform: scale(1, 1);
                opacity: 1;
            }
        </style>

        <header hidden?="${props.multiSelect}">

            <pl-icon icon="menu" class="tap" on-click="${() => this._toggleMenu()}" hidden?="${filterActive}"></pl-icon>

            <pl-input
                id="filterInput"
                class="filter-input tap"
                placeholder="${$l("Type To Search")}"
                active?="${filterActive}"
                value="${props.filterString}"
                on-escape="${() => this.clearFilter()}"
                on-input="${() => this._updateFilterString()}"
                no-tab>
            </pl-input>

            <pl-icon icon="add" class="tap" on-click="${() => this._newRecord()}" hidden?="${filterActive}"></pl-icon>

            <pl-icon
                icon="cancel"
                class="tap"
                on-click="${() => this.clearFilter()}"
                hidden?="${!filterActive}">
            </pl-icon>

        </header>

        <header hidden?="${!props.multiSelect}">

            <pl-icon icon="cancel" class="tap" on-click="${() => this.clearSelection()}"></pl-icon>

            <pl-icon icon="checked" class="tap" on-click="${() => this.selectAll()}"></pl-icon>

            <div class="multi-select-count"><div>${this._multiSelectLabel(props.selectedItems)}</div></div>

            <pl-icon icon="delete" class="tap" on-click="${() => this._deleteSelected()}"></pl-icon>

            <pl-icon icon="share" class="tap" on-click="${() => this._shareSelected()}"></pl-icon>

        </header>

        <div class="current-section tap"
            on-click="${() => this._selectSection()}"
            hidden?="${!props._listItems.length}">

            <pl-icon icon="dropdown" class="float-right"></pl-icon>

            <div>${props._currentSection}</div>

        </div>

        <main id="main" hidden?="${!props._listItems.length}">

            ${props._listItems.map(
                (item: any, index: number) => html`
                <div class="list-item" index$="${index}">

                    <div class="section-header" hidden?="${index === 0 || !item.firstInSection}">

                        <div>${item.section}</div>

                        <div class="spacer"></div>

                        <div>${item.section}</div>

                    </div>

                    <div class="record"
                        record="${item.record}"
                        record-id$="${item.record.id}"
                        selected?="${props.selectedItem && item.record.id === props.selectedItem.record.id}"
                        multi-select="${props.multiSelect}"
                        on-click="${() => this.selectItem(item)}"
                        index$="${index}">

                            <div class="record-highlight"></div>

                            <div class="record-header">

                                <div class="record-name" disabled?="${!item.record.name}">
                                    ${item.record.name || $l("No Name")}
                                </div>

                                <div class="spacer"></div>

                                <div class="record-tags">
                                    <div class="ellipsis record-tag store-tag">${item.store.name}</div> 
                                    ${this._tags(item.record).map(
                                        t => html`
                                            <div class="ellipsis record-tag">${t}</div>
                                        `
                                    )}
                                </div>

                            </div>

                            <div class="record-fields">

                                ${item.record.fields.map(
                                    (f: Field, i: number) => html`
                                        <div
                                            class="record-field"
                                            on-click="${(e: MouseEvent) => this._copyField(item.record, i, e)}">

                                            <div class="record-field-label">${f.name}</div>

                                            <div class="copied-message">${$l("copied")}</div>

                                        </div>
                                    `
                                )}

                                <div class="field" disabled hidden?="${!!item.record.fields.length}">
                                    ${$l("No Fields")}
                                </div>

                            </div>

                    </pl-record-item>

                    <div class="section-separator" hidden?="${!item.lastInSection}"></div>

                </div>
                `
            )}

        </main>

        <div hidden?="${!!props._listItems.length}" class="empty">

            <div class="empty-message">
                ${$l("You don't have any data yet! Start by creating your first record!")}
            </div>

            <div class="spacer tiles-2"></div>

        </div>

        <pl-alert-dialog
            id="sectionSelector"
            on-dialog-open="${(e: Event) => e.stopPropagation()}"
            on-dialog-close="${(e: Event) => e.stopPropagation()}">
        </pl-alert-dialog>

        <div class="rounded-corners"></div>
`;
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

    @listen("scroll", "main")
    _scrollHandler() {
        if (!this._bounds) {
            return;
        }
        const { top, right, bottom, left } = this._bounds;
        const middle = left + (right - left) / 2;
        let els = this.shadowRoot!.elementsFromPoint(middle, top + 10);

        for (const el of els) {
            if (el.hasAttribute("index")) {
                const i = parseInt(el.getAttribute("index") as string);
                this._firstVisibleIndex = i;
                break;
            }
        }
        els = this.shadowRoot!.elementsFromPoint(middle, bottom - 1);
        if (els.length) {
            for (const el of els) {
                if (el.hasAttribute("index")) {
                    const i = parseInt(el.getAttribute("index") as string);
                    if (i !== this._lastVisibleIndex) {
                        this._lastVisibleIndex = i;
                    }
                    break;
                }
            }
        } else {
            this._lastVisibleIndex = this._listItems.length - 1;
        }

        const currItem = this._listItems[this._firstVisibleIndex];
        this._currentSection = currItem && currItem.section;
    }

    selectItem(item: ListItem | null) {
        this.selectedItem = item;
        this.dispatchEvent(new CustomEvent("select-record", { detail: item || {} }));
        this._scrollToSelected();
    }

    selectAll() {}

    clearSelection() {
        this.selectItem(null);
    }

    private _newRecord() {
        if (!this.store) {
            return;
        }
        app.createRecord(this.store, "");
    }

    private _toggleMenu() {
        this.dispatchEvent(new CustomEvent("toggle-menu"));
    }

    private _scrollToIndex(i: number) {
        const el = this.$(`pl-record-item[index="${i}"]`);
        if (el) {
            this._main.scrollTop = el.offsetTop - 6;
        }
    }

    private _scrollToSelected() {
        if (!this.selectedItem) {
            return;
        }
        const i = this._listItems.indexOf(this.selectedItem);
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

    private async _selectSection() {
        const sections = [...new Set(this._listItems.map((i: any) => i.section))];
        if (sections.length > 1) {
            const i = await this._sectionSelector.show("", { options: sections });
            const item = this._listItems.find((item: any) => item.section === sections[i] && item.firstInSection);
            if (item) {
                this._scrollToIndex(this._listItems.indexOf(item));
            }
        }
    }

    private _animateItems(delay = 100) {
        this._main.style.opacity = "0";
        setTimeout(() => {
            this._scrollHandler();
            const elements = Array.from(this.$$(".list-item"));
            const animated = elements.slice(this._firstVisibleIndex, this._lastVisibleIndex + 1);

            animateCascade(animated, { clear: true });
            this._main.style.opacity = "1";
        }, delay);
    }

    private _shareSelected() {
        // const exportDialog = getDialog("pl-dialog-export") as ExportDialog;
        // exportDialog.export(this.selectedItems);
    }

    private async _deleteSelected() {
        // const confirmed = await confirm(
        //     $l("Are you sure you want to delete these records? This action can not be undone!"),
        //     $l("Delete {0} Records", this.selectedItems.length.toString())
        // );
        // if (confirmed) {
        //     app.deleteRecords(this.store!, this.selectedItems);
        //     this.multiSelect = false;
        // }
    }

    private _multiSelectLabel(selected: ListItem[]) {
        const count = selected && selected.length;
        return count ? $l("{0} records selected", count.toString()) : $l("tap to select");
    }

    search(str?: string) {
        if (str) {
            this.filterString = str;
        }
        this._filterInput.focus();
        this._updateListItems();
        this._animateItems();
    }

    clearFilter() {
        this.filterString = "";
        this._updateListItems();
        this._animateItems();
    }

    private _updateFilterString() {
        this.filterString = this._filterInput.value;
        this._updateListItems();
    }

    private _copyField(record: Record, index: number, e: Event) {
        e.stopPropagation();
        setClipboard(record, record.fields[index]);
        const fieldEl = e.target as HTMLElement;
        fieldEl.classList.add("copied");
        setTimeout(() => fieldEl.classList.remove("copied"), 1000);
    }

    private _tags(record: Record) {
        const tags = record.tags.slice(0, 2);
        const more = record.tags.length - tags.length;

        if (more) {
            tags.push("+" + more);
        }

        return tags;
    }
}

window.customElements.define("pl-list-view", ListView);
