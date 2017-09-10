(() => {

const Record = padlock.data.Record;
const { LocaleMixin, DataMixin, SyncMixin, BaseElement, DialogMixin } = padlock;
const { applyMixins } = padlock.util;
const { isTouch } = padlock.platform;

function filterByString(fs, rec) {
    const words = fs.toLowerCase().split(" ");

    // For the record to be a match, each word in the filter string has to appear
    // in either the category or the record name.
    for (var i = 0, match = true; i < words.length && match; i++) {
        match = rec.category && rec.category.toLowerCase().search(words[i]) != -1 ||
            rec.name.toLowerCase().search(words[i]) != -1;
    }

    return !!match;
}

class ListView extends applyMixins(
    BaseElement,
    LocaleMixin,
    SyncMixin,
    DataMixin,
    DialogMixin
) {

    static get is() { return "pl-list-view"; }

    static get properties() { return {
        _currentSection: {
            type: String,
            value: ""
        },
        _filterString: {
            type: String,
            value: ""
        },
        records: {
            type: Array,
            computed: " _filterAndSort(collection.records, _filterString)"
        },
        selectedRecord: {
            type: Object,
            notify: true
        }
    }; }

    static get observers() { return [
        "_fixScroll(records)",
        "_scrollToSelected(records, selectedRecord)",
        "_updateCurrentSection(records)"
    ]; }

    ready() {
        super.ready();
        this.classList.toggle("touch", isTouch());
        window.addEventListener("keydown", (e) => {
            switch (e.key) {
                case "ArrowDown":
                    this.$.list.focusItem(this.$.list.firstVisibleIndex);
                    break;
                case "ArrowUp":
                    this.$.list.focusItem(this.$.list.lastVisibleIndex);
                    break;
            }
        });
        this.$.list.addEventListener("keydown", (e) => e.stopPropagation());
        this.$.main.addEventListener("scroll", () => this._updateCurrentSection());
    }

    select(record) {
        this.$.list.selectItem(record);
    }

    deselect() {
        this.$.list.clearSelection();
    }

    recordCreated(record) {
        this.select(record);
    }

    _filterAndSort() {
        return this.collection.records
            .filter((r) => !r.removed && filterByString(this._filterString, r))
            .sort((a, b) => Record.compare(a, b));
    }

    _isEmpty() {
        return !this.collection.records.filter((r) => !r.removed).length;
    }

    _openMenu() {
        this.dispatchEvent(new CustomEvent("open-menu"));
    }

    _newRecord() {
        this.createRecord();
    }

    _filterActive() {
        return this._filterString !== "";
    }

    _clearFilter() {
        this.set("_filterString", "");
    }

    _lock() {
        if (this.isSynching) {
            this.alert($l("Cannot lock app while sync is in progress!"));
        } else {
            this.unloadData();
        }
    }

    _openSettings() {
        this.dispatchEvent(new CustomEvent("open-settings"));
    }

    _openCloudView() {
        this.dispatchEvent(new CustomEvent("open-cloud-view"));
    }

    _scrollToSelected() {
        const l = this.$.list;
        const i = l.items.indexOf(this.selectedRecord);
        if (i !== -1 && (i < l.firstVisibleIndex || i > l.lastVisibleIndex)) {
            l.scrollToItem(this.selectedRecord);
        }
    }

    _fixScroll() {
        // Workaround for list losing scrollability on iOS after resetting filter
        padlock.platform.isIOS().then((yes) => {
            if (yes) {
                this.$.main.style.overflow = "hidden";
                setTimeout(() => this.$.main.style.overflow = "auto", 100);
            }
        });
    }

    _firstInSection(records, index) {
        const prev = records[index - 1];
        const curr = records[index];

        if (!curr) {
            return false;
        }

        return !prev || this._sectionHeader(prev) !== this._sectionHeader(curr);
    }

    _lastInSection(records, index) {
        const curr = records[index];
        const next = records[index + 1];

        if (!curr) {
            return false;
        }

        return !next || this._sectionHeader(next) !== this._sectionHeader(curr);
    }

    _sectionHeader(record) {
        return record.name[0].toUpperCase();
    }

    _updateCurrentSection() {
        const record = this.records[this.$.list.firstVisibleIndex];
        this._currentSection = record && this._sectionHeader(record);
    }

    _selectSection() {
        const sections = Array.from(this.records.reduce((s, r) => s.add(this._sectionHeader(r)), new Set()));
        this.choose("", sections)
            .then((i) => {
                const record = this.records.find((r) => this._sectionHeader(r) === sections[i]);
                this.$.list.scrollToItem(record);
            });
    }

    _searchCategory(e) {
        this._filterString = e.detail;
    }

    focusFilterInput() {
        this.$.filterInput.focus();
    }

}

window.customElements.define(ListView.is, ListView);

})();
