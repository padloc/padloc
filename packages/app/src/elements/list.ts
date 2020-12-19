import { BaseElement, element, property, listen, query } from "./base";

@element("pl-list")
export class List extends BaseElement {
    @property()
    selectable: boolean = false;

    @property()
    itemSelector?: string;

    @query(":focus")
    focusedElement: HTMLElement;

    get focusedIndex() {
        const focusedEl = this.focusedElement;
        if (!focusedEl) {
            return -1;
        }
        const ariaIndex = focusedEl.getAttribute("aria-posinset") && Number(focusedEl.getAttribute("aria-posinset"));
        return typeof ariaIndex === "number" && !isNaN(ariaIndex) ? ariaIndex : this._items.indexOf(focusedEl);
    }

    private get _items() {
        return [...(this.itemSelector ? this.querySelectorAll(this.itemSelector) : this.children)] as HTMLElement[];
    }

    private get _setSize() {
        const focusedEl = this.focusedElement;
        const ariaSetSize =
            focusedEl && focusedEl.getAttribute("aria-setsize") && Number(focusedEl.getAttribute("aria-setsize"));
        return typeof ariaSetSize === "number" && !isNaN(ariaSetSize) ? ariaSetSize : this._items.length;
    }

    private _mutationObserver = new MutationObserver(() => this._contentChanged());

    connectedCallback() {
        super.connectedCallback();
        this._mutationObserver.observe(this, { childList: true, subtree: true });
        // this.setAttribute("tabIndex", "0");
        this._contentChanged();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._mutationObserver.disconnect();
    }

    createRenderRoot() {
        return this;
    }

    private _focusIndex(index: number) {
        const item = (this.querySelector(`[aria-posinset="${index}"]`) as HTMLElement) || this._items[index];
        for (const item of this._items) {
            item.setAttribute("tabIndex", "-1");
        }

        if (item) {
            item.setAttribute("tabIndex", "0");
            item.focus();
        }
    }

    private _contentChanged() {
        if (this.focusedIndex === -1) {
            this._focusIndex(0);
        }
    }

    @listen("keydown", this)
    protected _keypress(e: KeyboardEvent) {
        const currIndex = this.focusedIndex;
        const setSize = this._setSize;

        switch (e.key) {
            case "Enter":
                const el = this.focusedElement;
                if (el) {
                    el.click();
                    e.preventDefault();
                }
                break;
            case "ArrowDown":
                this._focusIndex((currIndex + 1) % setSize);
                e.preventDefault();
                break;
            case "ArrowUp":
                this._focusIndex((currIndex - 1 + setSize) % setSize);
                e.preventDefault();
                break;
        }
    }
}
