(() => {

const Record = padlock.data.Record;

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

class ListView extends Polymer.Element {
    static get is() { return "pl-list-view"; }

    static get properties() { return {
        _filterString: {
            type: String,
            value: ""
        },
        records: Array,
    }; }

    _filterAndSort() {
        return this.records
            .filter((r) => !r.removed && filterByString(this._filterString, r))
            .sort((a, b) => Record.compare(a, b));
    }

    _itemClass(index) {
        return "tiles-" + (Math.floor((index + 1) % 8) + 1);
    }

    _isEmpty() {
        return !this.records.length;
    }

    _recordTapped(e) {
        this.dispatchEvent(new CustomEvent("record-select", { detail: { record: e.model.item } }));
    }

    _openMenu() {
        this.dispatchEvent(new CustomEvent("open-menu"));
    }

    _newRecord() {
        this.dispatchEvent(new CustomEvent("record-new"));
    }

    _filterActive() {
        return this._filterString !== "";
    }

    _clearFilter() {
        this.set("_filterString", "");
    }

    _limit(items) {
        return items.slice(0, 50);
    }

}

window.customElements.define(ListView.is, ListView);

})();
