import { Record } from "@padlock/core/lib/data.js";
// @ts-ignore
import { PolymerElement, html } from "@polymer/polymer/polymer-element";
// @ts-ignore
import { MutableData } from "@polymer/polymer/lib/mixins/mutable-data.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { isIOS } from "@padlock/core/lib/platform.js";
import { animateCascade } from "../animation";
import { app } from "../init";
import { confirm } from "../dialog";
import "@polymer/iron-list/iron-list.js";
import "./dialog-alert.js";
import "./icon.js";
import "./input.js";
import "./record-item.js";

// declare class PolymerElement extends HTMLElement {
//     $: any;
//     ready(): void;
//     set(prop: string, val: any): void;
//     root: ShadowRoot;
//     notifyPath(path: string): void;
// }
//
// type Constructor<T = {}> = new (...args: any[]) => T;
// declare function MutableData(cl: any): Constructor<PolymerElement>;

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

class ListView extends MutableData(PolymerElement) {
    static get template() {
        return html`
        <style include="shared">
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

            iron-list {
                margin-top: -35px;
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

        <header hidden$="[[ multiSelect ]]">

            <pl-icon icon="menu" class="tap" on-click="_toggleMenu" hidden$="[[ filterActive ]]"></pl-icon>

            <pl-input
                id="filterInput"
                class="filter-input tap"
                placeholder="[[ $l('Type To Search') ]]"
                active$="[[ filterActive ]]"
                value="[[ filterString ]]"
                on-escape="clearFilter"
                on-input="_updateFilterString"
                no-tab="">
            </pl-input>

            <pl-icon icon="add" class="tap" on-click="_newRecord" hidden$="[[ filterActive ]]"></pl-icon>

            <pl-icon icon="cancel" class="tap" on-click="clearFilter" hidden$="[[ !filterActive ]]"></pl-icon>

        </header>

        <header hidden$="[[ !multiSelect ]]">

            <pl-icon icon="cancel" class="tap" on-click="_clearMultiSelection"></pl-icon>

            <pl-icon icon="checked" class="tap" on-click="_selectAll"></pl-icon>

            <div class="multi-select-count"><div>[[ _multiSelectLabel(selectedRecords.length) ]]</div></div>

            <pl-icon icon="delete" class="tap" on-click="_deleteSelected"></pl-icon>

            <pl-icon icon="share" class="tap" on-click="_shareSelected"></pl-icon>

        </header>

        <div class="current-section tap" on-click="_selectSection" hidden$="[[ _isEmpty(records.length) ]]">

            <pl-icon icon="dropdown" class="float-right"></pl-icon>

            <div>[[ _currentSection ]]</div>

        </div>

        <main id="main">

            <iron-list
                id="list"
                mutable-data
                scroll-target="main"
                multi-selection="[[ multiSelect ]]"
                hidden$="[[ _isEmpty(records.length) ]]"
                items="[[ records ]]"
                selection-enabled
                selected-item="{{ _selectedRecord }}"
                selected-items="{{ selectedRecords }}">

                <template>

                    <div>

                        <div class="section-header" hidden$="[[ !_firstInSection(index, records) ]]">

                            <div>[[ _sectionHeader(index, records) ]]</div>

                            <div class="spacer"></div>

                            <div>[[ _sectionHeader(index, records) ]]</div>

                        </div>

                        <pl-record-item
                            record="[[ item ]]"
                            selected$="[[ selected ]]"
                            tabindex$="[[ tabIndex ]]"
                            multi-select="[[ multiSelect ]]"
                            on-multi-select="_recordMultiSelect">
                        </pl-record-item>

                        <div class="section-separator" hidden$="[[ !_lastInSection(index, records) ]]"></div>

                    </div>

                </template>

            </iron-list>

        </main>

        <div hidden$="[[ !_isEmpty(records.length) ]]" class="empty">

            <div class="empty-message">
                [[ $l("You don't have any data yet! Start by creating your first record!") ]]
            </div>

            <div class="spacer tiles-2"></div>

        </div>

        <pl-dialog-alert
            id="sectionSelector"
            on-dialog-open="_stopPropagation"
            on-dialog-close="_stopPropagation">
        </pl-dialog-alert>

        <div class="rounded-corners"></div>
`;
    }

    static get is() {
        return "pl-list-view";
    }

    _records: Record[];
    _currentSection: string;
    filterActive: boolean;
    multiSelect: boolean;
    _selectedRecord: Record | null;
    selectedRecords: Record[];
    filterString: string;
    records: Record[];
    _recentCount: number;
    _lastSelectCount: number;

    static get properties() {
        return {
            store: Object,
            _currentSection: {
                type: String,
                value: ""
            },
            filterActive: {
                type: Boolean,
                computed: "_filterActive(filterString)"
            },
            multiSelect: {
                type: Boolean,
                value: false
            },
            _selectedRecord: {
                type: Object,
                observer: "_selectedRecordChanged"
            },
            selectedRecords: {
                type: Array,
                value: () => []
            },
            filterString: {
                type: String,
                value: ""
            },
            records: {
                type: Array,
                computed: "_filterAndSort(store.records, filterString)"
            }
        };
    }

    static get observers() {
        return [
            "_fixScroll(records)",
            "_scrollToSelected(records, _selectedRecord)",
            "_updateCurrentSection(records)",
            "_selectedCountChanged(selectedRecords.length)",
            "_currentRecordChanged(state.currentRecord)",
            "_recordsChanged(records)"
        ];
    }

    $l = $l;

    ready() {
        super.ready();

        const changeHandler = (e: CustomEvent) => {
            if (e.detail.store === this.store) {
                this.notifyPath("store");
            }
        };
        app.addEventListener("records-added", changeHandler);
        app.addEventListener("records-deleted", changeHandler);
        app.addEventListener("record-changed", changeHandler);
        app.addEventListener("record-created", (e: CustomEvent) => {
            this.$.list.selectItem(e.detail.record);
        });

        window.addEventListener("keydown", e => {
            switch (e.key) {
                case "ArrowDown":
                    this.$.list.focusItem(this.$.list.firstVisibleIndex);
                    break;
                case "ArrowUp":
                    this.$.list.focusItem(this.$.list.lastVisibleIndex);
                    break;
            }
        });
        this.$.list.addEventListener("keydown", (e: Event) => e.stopPropagation());
        this.$.main.addEventListener("scroll", () => this._updateCurrentSection());
        // this.listen("data-loaded", () => {
        //     this.animateRecords(600);
        // });
        // this.listen("sync-success", e => {
        //     if (!e.detail || !e.detail.auto) {
        //         this.animateRecords();
        //     }
        // });
        // this.listen("data-imported", () => this.animateRecords());
    }

    _filterAndSort() {
        if (!this.store) {
            return [];
        }
        let records = this.store.records.filter(r => !r.removed && filterByString(this.filterString, r));
        this._recentCount = records.length > 10 ? 3 : 0;
        const recent = records
            .sort((a, b) => {
                return (b.lastUsed || b.updated).getTime() - (a.lastUsed || a.updated).getTime();
            })
            .slice(0, this._recentCount);
        records = records.slice(this._recentCount);

        return recent.concat(
            records.sort((a: Record, b: Record) => {
                const x = a.name.toLowerCase();
                const y = b.name.toLowerCase();
                return x > y ? 1 : x < y ? -1 : 0;
            })
        );
    }

    deselect() {
        this.$.list.clearSelection();
    }

    _selectedRecordChanged() {
        // app.selectRecord(this._selectedRecord);
        this.dispatchEvent(new CustomEvent("select-record", { detail: { record: this._selectedRecord } }));
    }

    _isEmpty() {
        return !this.records.length;
    }

    _openMenu() {
        this.dispatchEvent(new CustomEvent("open-menu"));
    }

    _newRecord() {
        const record = app.createRecord(this.store, "");
    }

    _filterActive() {
        return this.filterString !== "";
    }

    _toggleMenu() {
        this.dispatchEvent(new CustomEvent("toggle-menu"));
    }

    _openSettings() {
        this.dispatchEvent(new CustomEvent("open-settings"));
    }

    _openCloudView() {
        this.dispatchEvent(new CustomEvent("open-cloud-view"));
    }

    _scrollToSelected() {
        const l = this.$.list;
        const i = l.items.indexOf(this._selectedRecord);
        if (i !== -1 && (i < l.firstVisibleIndex || i > l.lastVisibleIndex)) {
            // Scroll to item before the selected one so that selected
            // item is more towards the middle of the list
            l.scrollToIndex(Math.max(i - 1, 0));
        }
    }

    _fixScroll() {
        // Workaround for list losing scrollability on iOS after resetting filter
        isIOS().then(yes => {
            if (yes) {
                this.$.main.style.overflow = "hidden";
                setTimeout(() => (this.$.main.style.overflow = "auto"), 100);
            }
        });
    }

    _firstInSection(index: number) {
        return index === 0 || this._sectionHeader(index - 1) !== this._sectionHeader(index);
    }

    _lastInSection(index: number) {
        return this._sectionHeader(index + 1) !== this._sectionHeader(index);
    }

    _sectionHeader(index: number) {
        const record = this.records[index];
        return index < this._recentCount
            ? $l("Recently Used")
            : (record && record.name[0] && record.name[0].toUpperCase()) || $l("No Name");
    }

    _updateCurrentSection() {
        this._currentSection = this._sectionHeader(this.$.list.firstVisibleIndex);
    }

    async _selectSection() {
        const sections = Array.from(this.records.reduce((s, _, i) => s.add(this._sectionHeader(i)), new Set()));
        if (sections.length > 1) {
            const i = await this.$.sectionSelector.show("", sections);
            const record = this.records.find((_, j) => this._sectionHeader(j) === sections[i]);
            this.$.list.scrollToItem(record);
        }
    }

    animateRecords(delay = 100) {
        const m4e = (e: Element) => this.$.list.modelForElement(e);

        this.$.list.style.opacity = 0;
        setTimeout(() => {
            const first = this.$.list.firstVisibleIndex;
            const last = this.$.list.lastVisibleIndex + 1;
            const elements = Array.from(this.root.querySelectorAll("pl-record-item, .section-header"));
            const animated = elements
                .filter(el => m4e(el).index >= first && m4e(el).index <= last)
                .sort((a, b) => m4e(a).index - m4e(b).index);

            animateCascade(animated);
            this.$.list.style.opacity = 1;
        }, delay);
    }

    _stopPropagation(e: Event) {
        e.stopPropagation();
    }

    _selectedCountChanged() {
        const count = this.selectedRecords && this.selectedRecords.length;
        if (this._lastSelectCount && !count) {
            this.multiSelect = false;
        }
        this._lastSelectCount = count;
    }

    _recordMultiSelect() {
        this.multiSelect = true;
    }

    _clearMultiSelection() {
        this.$.list.clearSelection();
        this.multiSelect = false;
    }

    _selectAll() {
        this.records.forEach(r => this.$.list.selectItem(r));
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
            app.deleteRecords(this.store, this.selectedRecords);
            this.multiSelect = false;
        }
    }

    _multiSelectLabel(count: number) {
        return count ? $l("{0} records selected", count.toString()) : $l("tap to select");
    }

    search() {
        this.$.filterInput.focus();
    }

    clearFilter() {
        this.filterString = "";
    }

    _updateFilterString() {
        this.filterString = this.$.filterInput.value;
    }

    _recordsChanged() {
        for (const item of this.root.querySelectorAll("pl-record-item")) {
            item.requestRender();
        }
    }
}

window.customElements.define(ListView.is, ListView);
