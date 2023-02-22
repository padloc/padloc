import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, queryAll, state } from "lit/decorators.js";

@customElement("pl-sortable-list")
export class SortableList<T = any> extends LitElement {
    @property({ attribute: false })
    items: T[] = [];

    @state()
    private _draggingIndex?: number;

    @state()
    private _draggingElHeight: number = 0;

    @queryAll("li .item-inner")
    private _itemEls: NodeListOf<HTMLLIElement>;

    @property({ attribute: false })
    renderItem: (item: T, index: number) => TemplateResult;

    createRenderRoot() {
        return this;
    }

    private _dragStart(i: number) {
        this._draggingIndex = i;
        const draggedEl = this._itemEls[i];
        this._draggingElHeight = draggedEl.offsetHeight;
        setTimeout(() => (draggedEl.style.opacity = "0"), 50);
        for (const el of this._itemEls) {
            el.style.transition = "transform 0.3s";
            el.style.pointerEvents = "none";
            el.offsetLeft;
        }
    }

    private _dragEnter(i: number) {
        if (this._draggingIndex === undefined) {
            return;
        }

        for (const [j, el] of this._itemEls.entries()) {
            if (j > this._draggingIndex && j <= i) {
                el.style.transform = `translateY(-${this._draggingElHeight}px)`;
            } else if (j < this._draggingIndex && j >= i) {
                el.style.transform = `translateY(${this._draggingElHeight}px)`;
            } else {
                el.style.transform = "";
            }
        }

        // if (i > this._draggingIndex) {
        //     for (let j = i; j > this._draggingIndex; j--) {
        //         console.log("moving up item", j);
        //         this._itemEls[j].style.transform = "translateY(-100%)";
        //     }
        // }

        // if (this._draggingIndex === undefined || !this._updatedOrder) {
        //     return;
        // }
        // const updated = [...this.items];

        // const removed = updated.splice(this._draggingIndex, 1);
        // updated?.splice(i, 0, ...removed);
        // this._updatedOrder = updated;
    }

    private _dragEnd() {
        for (const item of this._itemEls) {
            item.style.transition = "";
            item.offsetLeft;
            item.style.transform = "";
            item.style.pointerEvents = "";
            item.style.opacity = "";
        }
        this._draggingIndex = undefined;
    }

    private _drop(toIndex: number) {
        if (this._draggingIndex === undefined) {
            return;
        }

        const fromIndex = this._draggingIndex;

        if (fromIndex !== toIndex) {
            const [item] = this.items.splice(this._draggingIndex, 1);
            this.items.splice(toIndex, 0, item);
            this.dispatchEvent(new CustomEvent("item-moved", { detail: { item, fromIndex, toIndex } }));
        }

        this._dragEnd();

        this.requestUpdate("items");
    }

    render() {
        if (!this.renderItem) {
            return;
        }

        return html`<ol @dragend=${this._dragEnd}>
            ${this.items.map(
                (item, i) =>
                    html`
                        <li
                            @dragstart=${(e: DragEvent) => {
                                this._dragStart(i);
                                e.dataTransfer?.setData("text/plain", "asdf");
                            }}
                            @dragenter=${(e: DragEvent) => {
                                e.preventDefault();
                                this._dragEnter(i);
                            }}
                            @dragover=${(e: DragEvent) => e.preventDefault()}
                            @drop=${(e: DragEvent) => {
                                e.preventDefault();
                                this._drop(i);
                            }}
                            draggable="true"
                        >
                            <div class="item-inner">${this.renderItem(item, i)}</div>
                        </li>
                    `
            )}
        </ol>`;
    }
}
