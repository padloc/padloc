import { LitElement } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("pl-list")
export class List extends LitElement {
    @property({ type: Boolean })
    selectable: boolean = false;

    @property()
    itemSelector?: string;

    // @query(":focus")
    // focusedElement: HTMLElement;

    @property({ type: Number })
    focusedIndex: number = -1;

    private _keydownListener = (e: KeyboardEvent) => this._keydown(e);

    get focusedElement(): HTMLElement | null {
        return (
            this.querySelector(`${this.itemSelector || ""}[aria-posinset="${this.focusedIndex}"]`) ||
            this._items[this.focusedIndex] ||
            null
        );
    }

    // get focusedIndex() {
    //     const focusedEl = this.focusedElement;
    //     if (!focusedEl) {
    //         return -1;
    //     }
    //     const ariaIndex = focusedEl.getAttribute("aria-posinset") && Number(focusedEl.getAttribute("aria-posinset"));
    //     return typeof ariaIndex === "number" && !isNaN(ariaIndex) ? ariaIndex : this._items.indexOf(focusedEl);
    // }

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
        this.addEventListener("keydown", this._keydownListener);
        // this.setAttribute("tabIndex", "0");
        this._contentChanged();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._mutationObserver.disconnect();
        this.removeEventListener("keydown", this._keydownListener);
    }

    createRenderRoot() {
        return this;
    }

    focusIndex(index: number, passive = false) {
        this.focusedIndex = index;

        for (const item of this._items) {
            item.setAttribute("tabIndex", "-1");
        }

        const item = this.focusedElement;

        if (item) {
            item.setAttribute("tabIndex", "0");
            if (!passive) {
                item.focus();
            }
        }
    }

    private _contentChanged() {
        if (this.focusedIndex === -1) {
            this.focusIndex(0, true);
        }
    }

    private _keydown(e: KeyboardEvent) {
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
                this.focusIndex((currIndex + 1) % setSize);
                e.preventDefault();
                break;
            case "ArrowUp":
                this.focusIndex((currIndex - 1 + setSize) % setSize);
                e.preventDefault();
                break;
        }
    }
}
