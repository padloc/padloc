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

class ListView extends padlock.BaseElement {
    static get is() { return "pl-list-view"; }

    static get properties() { return {
        _filterString: {
            type: String,
            value: ""
        },
        records: {
            type: Array,
            observer: "_recordsChanged"
        },
        selectedRecord: {
            type: Object,
            notify: true
        }
    }; }

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

    _filterAndSort() {
        return this.records
            .filter((r) => !r.removed && filterByString(this._filterString, r))
            .sort((a, b) => Record.compare(a, b));
    }

    _isEmpty() {
        return !this.records.filter((r) => !r.removed).length;
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

    _lock() {
        this.dispatchEvent(new CustomEvent("lock"));
    }

    _openSettings() {
        this.dispatchEvent(new CustomEvent("open-settings"));
    }

    _openCloudView() {
        this.dispatchEvent(new CustomEvent("open-cloud-view"));
    }

    _recordsChanged() {
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
