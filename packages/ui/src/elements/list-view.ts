import { Record, Store } from "@padlock/core/lib/data.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { isIOS } from "@padlock/core/lib/platform.js";
// import { animateCascade } from "../animation.js";
import { app } from "../init.js";
import { confirm } from "../dialog.js";
import sharedStyles from "../styles/shared.js";
import { AlertDialog } from "./alert-dialog.js";
import { BaseElement, html, property, query } from "./base.js";
import "./icon.js";
import { Input } from "./input.js";
import "./record-item.js";

function filterByString(fs: string, rec: Record) {
    if (!fs) {
        return true;
    }
    const words = fs.toLowerCase().split(" ");
    const content = rec.tags
        .concat([rec.name])
        .join(" ")
        .toLowerCase();
    return words.some(word => content.search(word) !== -1);
}

interface ListItem {
    record: Record;
    section: string;
    firstInSection: boolean;
    lastInSection: boolean;
}

export class ListView extends BaseElement {
    @property() store?: Store;
    @property() multiSelect: boolean = false;
    @property() filterString: string = "";
    @property() selectedRecord: Record | null = null;
    @property() selectedRecords: Record[] = [];
    @property() private _records: Record[] = [];
    @property() private _listItems: ListItem[] = [];
    @property() private _currentSection: string = "";
    @property() private _firstVisibleIndex: number = 0;
    @property() private _lastVisibleIndex: number = 0;

    @query("main") private _main: HTMLDivElement;
    @query("#sectionSelector") private _sectionSelector: AlertDialog;
    @query("#filterInput") private _filterInput: Input;

    private _cachedBounds?: DOMRect | ClientRect;
    private _recentCount: number = 0;

    connectedCallback() {
        super.connectedCallback();

        const changeHandler = (e: CustomEvent) => {
            if (e.detail.store === this.store) {
                this._updateRecords;
            }
        };
        app.addEventListener("records-added", changeHandler);
        app.addEventListener("records-deleted", changeHandler);
        app.addEventListener("record-changed", changeHandler);
        app.addEventListener("record-created", (e: CustomEvent) => {
            this.selectRecord(e.detail.record);
        });
        app.addEventListener("unlock", () => {
            this._updateRecords();
            this.animateRecords(600);
        });

        // window.addEventListener("keydown", e => {
        //     switch (e.key) {
        //         case "ArrowDown":
        //             this.shadowRoot!.querySelector("#list").focusItem(this.$.list.firstVisibleIndex);
        //             break;
        //         case "ArrowUp":
        //             this.shadowRoot!.querySelector("#list").focusItem(this.$.list.lastVisibleIndex);
        //             break;
        //     }
        // });
        this._main.addEventListener("scroll", () => this._scroll());
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

            <div class="multi-select-count"><div>${this._multiSelectLabel(props.selectedRecords)}</div></div>

            <pl-icon icon="delete" class="tap" on-click="${() => this._deleteSelected()}"></pl-icon>

            <pl-icon icon="share" class="tap" on-click="${() => this._shareSelected()}"></pl-icon>

        </header>

        <div class="current-section tap"
            on-click="${() => this._selectSection()}"
            hidden?="${!props._records.length}">

            <pl-icon icon="dropdown" class="float-right"></pl-icon>

            <div>${props._currentSection}</div>

        </div>

        <main id="main" hidden?="${!props._records.length}">

            ${props._listItems.map(
                (item: any, index: number) => html`
                <div class="list-item" index$="${index}">

                    <div class="section-header" hidden?="${index === 0 || !item.firstInSection}">

                        <div>${item.section}</div>

                        <div class="spacer"></div>

                        <div>${item.section}</div>

                    </div>

                    <pl-record-item
                        record="${item.record}"
                        selected?="${item.record === props.selectedRecord}"
                        multi-select="${props.multiSelect}"
                        on-click="${() => this.selectRecord(item.record)}">
                    </pl-record-item>

                    <div class="section-separator" hidden?="${!item.lastInSection}"></div>

                </div>
                `
            )}

        </main>

        <div hidden?="${!!props._records.length}" class="empty">

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

    _didRender() {
        this._scroll();
    }

    _resized() {
        delete this._cachedBounds;
    }

    get _bounds(): DOMRect | ClientRect | null {
        if (!this._main) {
            return null;
        }
        if (!this._cachedBounds) {
            this._cachedBounds = this._main.getBoundingClientRect();
        }
        return this._cachedBounds;
    }

    _scroll() {
        if (!this._bounds) {
            return;
        }
        const { top, left, bottom } = this._bounds;
        let els = this.shadowRoot!.elementsFromPoint(left + 1, top + 1);
        for (const el of els) {
            if (el.hasAttribute("index")) {
                const i = parseInt(el.getAttribute("index") as string);
                if (i !== this._firstVisibleIndex) {
                    this._firstVisibleIndex = i;
                    this._updateCurrentSection();
                }
                break;
            }
        }
        els = this.shadowRoot!.elementsFromPoint(left + 1, bottom - 1);
        for (const el of els) {
            if (el.hasAttribute("index")) {
                const i = parseInt(el.getAttribute("index") as string);
                if (i !== this._lastVisibleIndex) {
                    this._lastVisibleIndex = i;
                }
                break;
            }
        }
    }

    _filterAndSort() {
        if (!this.store) {
            return [];
        }
        let records = this.store.records.filter((r: Record) => !r.removed && filterByString(this.filterString, r));
        this._recentCount = records.length > 10 ? 3 : 0;
        const recent = records
            .sort((a: Record, b: Record) => {
                return (b.lastUsed || b.updated).getTime() - (a.lastUsed || a.updated).getTime();
            })
            .slice(0, this._recentCount);
        records = records.slice(this._recentCount);

        records = recent.concat(
            records.sort((a: Record, b: Record) => {
                const x = a.name.toLowerCase();
                const y = b.name.toLowerCase();
                return x > y ? 1 : x < y ? -1 : 0;
            })
        );

        return records;
    }

    _updateRecords() {
        this._records = this._filterAndSort();
        const items = this._records.map((record: Record, index: number) => {
            const section =
                index < this._recentCount
                    ? $l("Recently Used")
                    : (record && record.name[0] && record.name[0].toUpperCase()) || $l("No Name");
            return {
                record,
                section
            } as ListItem;
        });
        for (let i = 0, prev, curr, next; i < items.length; i++) {
            prev = items[i - 1];
            curr = items[i];
            next = items[i + 1];
            curr.firstInSection = !prev || prev.section !== curr.section;
            curr.lastInSection = !next || next.section !== curr.section;
        }
        this._listItems = items;
    }

    selectRecord(record: Record | null) {
        this.selectedRecord = record;
        this.dispatchEvent(new CustomEvent("select-record", { detail: { record } }));
        this._scrollToSelected();
    }

    selectAll() {}

    clearSelection() {
        this.selectRecord(null);
    }

    _openMenu() {
        this.dispatchEvent(new CustomEvent("open-menu"));
    }

    _newRecord() {
        if (!this.store) {
            return;
        }
        app.createRecord(this.store, "");
    }

    _toggleMenu() {
        this.dispatchEvent(new CustomEvent("toggle-menu"));
    }

    _scrollToSelected() {
        if (!this.selectedRecord) {
            return;
        }
        const i = this._records.indexOf(this.selectedRecord);
        if (i !== -1 && (i < this._firstVisibleIndex || i > this._lastVisibleIndex)) {
            // Scroll to item before the selected one so that selected
            // item is more towards the middle of the list
            const el = this.shadowRoot!.querySelector(`.list-item[index=i]`);
            el && el.scrollIntoView();
        }
    }

    _fixScroll() {
        // Workaround for list losing scrollability on iOS after resetting filter
        isIOS().then(yes => {
            if (yes) {
                this._main.style.overflow = "hidden";
                setTimeout(() => (this._main.style.overflow = "auto"), 100);
            }
        });
    }

    _updateCurrentSection() {
        const currItem = this._listItems[this._firstVisibleIndex];
        this._currentSection = currItem && currItem.section;
    }

    async _selectSection() {
        const sections = [...new Set(this._listItems.map((i: any) => i.section))];
        if (sections.length > 1) {
            const i = await this._sectionSelector.show("", { options: sections });
            const item = this._listItems.find((item: any) => item.section === sections[i] && item.firstInSection);
            const element = item && this._main.children[this._listItems.indexOf(item)];
            element && element.scrollIntoView();
        }
    }

    animateRecords(delay = 100) {
        return delay;
        // this._main.style.opacity = 0;
        // setTimeout(() => {
        //     const first = this.shadowRoot!.querySelector("#list").firstVisibleIndex;
        //     const last = this.shadowRoot!.querySelector("#list").lastVisibleIndex + 1;
        //     const elements = Array.from(
        //         this.shadowRoot!.querySelectorAll("pl-record-item, .section-header")
        //     ) as Element[];
        //     const animated = elements
        //         .filter((el: Element) => m4e(el).index >= first && m4e(el).index <= last)
        //         .sort((a: Element, b: Element) => m4e(a).index - m4e(b).index);
        //
        //     animateCascade(animated);
        //     this.shadowRoot!.querySelector("#list").style.opacity = 1;
        // }, delay);
    }

    _recordMultiSelect() {
        this.multiSelect = true;
    }

    _shareSelected() {
        // const exportDialog = getDialog("pl-dialog-export") as ExportDialog;
        // exportDialog.export(this.selectedRecords);
    }

    async _deleteSelected() {
        const confirmed = await confirm(
            $l("Are you sure you want to delete these records? This action can not be undone!"),
            $l("Delete {0} Records", this.selectedRecords.length.toString())
        );

        if (confirmed) {
            app.deleteRecords(this.store!, this.selectedRecords);
            this.multiSelect = false;
        }
    }

    _multiSelectLabel(selected: Record[]) {
        const count = selected && selected.length;
        return count ? $l("{0} records selected", count.toString()) : $l("tap to select");
    }

    search() {
        this._filterInput.focus();
    }

    clearFilter() {
        this.filterString = "";
    }

    _updateFilterString() {
        this.filterString = this._filterInput.value;
        this._updateRecords();
    }

    _recordsChanged() {
        for (const item of this.shadowRoot!.querySelectorAll("pl-record-item") as NodeListOf<LitElement>) {
            item.requestRender();
        }
    }
}

window.customElements.define("pl-list-view", ListView);
