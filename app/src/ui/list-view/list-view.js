(() => {

class ListView extends Polymer.Element {
    static get is() { return "pl-list-view"; }

    static get properties() { return {
        records: Array,
        selected: {
            type: Object,
            notify: true
        }
    }; }

    connectedCallback() {
        super.connectedCallback();
        this._resized();
        window.addEventListener("resize", this._resized.bind(this));
    }

    _isEmpty() {
        return !this.records.length;
    }

    _isDark(i) {
        const nRow = Math.floor(i / this._nCols);

        if (!(this._nCols % 2) && nRow % 2) {
            i++;
        }

        return !!(i % 2);
    }

    _recordTapped(e) {
        this.selected = e.target;
    }

    _resized() {
        const width = this.offsetWidth;
        const recMinWidth = 250;
        this._nCols = Math.floor(width / recMinWidth);
    }

    _openMenu() {
        this.dispatchEvent(new CustomEvent("open-menu"));
    }
}

window.customElements.define(ListView.is, ListView);

})();
