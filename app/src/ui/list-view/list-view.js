(() => {

const Record = padlock.data.Record;
const { LocaleMixin, DataMixin, BaseElement } = padlock;

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

class ListView extends LocaleMixin(DataMixin(BaseElement)) {

    static get is() { return "pl-list-view"; }

    static get properties() { return {
        _filterString: {
            type: String,
            value: ""
        },
        selectedRecord: {
            type: Object,
            notify: true
        },
        isSynching: {
            type: Boolean,
            value: false
        }
    }; }

    static get observers() { return [
        "_scrollToSelected(collection.records, selectedRecord)"
    ]; }

    ready() {
        super.ready();
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
        this.unloadData();
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

    focusFilterInput() {
        this.$.filterInput.focus();
    }

}

window.customElements.define(ListView.is, ListView);

})();
