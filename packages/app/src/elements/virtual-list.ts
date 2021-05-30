import { guard } from "lit-html/directives/guard";
import { mixins } from "../styles";
import { Scroller } from "./scroller";
import { List } from "./list";
import { customElement, property, query, queryAll } from "lit/decorators";
import { css, html, LitElement, TemplateResult, render } from "lit";

@customElement("pl-virtual-list")
export class VirtualList<T> extends List {
    @property({ attribute: false })
    data: T[] = [];

    @property({ type: Number })
    minItemWidth: number = -1;

    @property({ type: Number })
    itemHeight: number;

    @property()
    renderItem: (data: T, index: number) => TemplateResult;

    @property({ type: Number })
    buffer: number = 2;

    @property()
    guard?: (data: T) => any[];

    get firstIndex() {
        return this._firstIndex;
    }
    get lastIndex() {
        return this._lastIndex;
    }

    @query("pl-scroller")
    private _scroller: Scroller;

    @queryAll(".cell")
    private _cells: HTMLDivElement[];

    private _firstIndex: number;
    private _lastIndex: number;
    private _height: number;
    private _width: number;
    private _canvasHeight: number;
    private _itemWidth: number;
    private _itemHeight: number;
    private _itemsPerRow: number;

    private _elements: {
        index: number;
        data: T | null;
        x: number;
        y: number;
    }[] = [];

    connectedCallback() {
        super.connectedCallback();
        window.addEventListener("resize", () => this._updateBounds());
    }

    firstUpdated() {
        this._scroller.addEventListener("scroll", () => this._updateIndizes(), { passive: true });
        this._updateBounds();
    }

    updated(changes: Map<string, any>) {
        if (changes.has("data") || changes.has("minItemWidth") || changes.has("itemHeight")) {
            this._updateBounds();
        }
    }

    scrollToIndex(index: number) {
        const { y } = this._getItemPosition(index);
        this._scroller.scrollTop = y;
        return this._updateIndizes();
    }

    async focusIndex(index: number, passive = false) {
        console.log("virtual list focusIndex", index);
        if (index < this._firstIndex || index > this._lastIndex) {
            await this.scrollToIndex(index);
        }
        super.focusIndex(index, passive);
    }

    private _getItemHeight() {
        if (!this.data.length) {
            return 100;
        }

        const testEl = document.createElement("div");
        testEl.style.position = "absolute";
        testEl.style.opacity = "0";
        render(this.renderItem(this.data[0], 0), testEl);
        this.appendChild(testEl);
        const height = testEl.offsetHeight;
        testEl.remove();
        return height;
    }

    private _updateBounds() {
        this._itemHeight = this.itemHeight || this._getItemHeight();
        const { width, height } = this.getBoundingClientRect();
        this._width = width;
        this._height = height;
        this._itemsPerRow = this.minItemWidth === -1 ? 1 : Math.floor(this._width / (this.minItemWidth || this._width));
        this._itemWidth = this._itemsPerRow > 1 ? this._width / this._itemsPerRow : -1;
        const rowCount = Math.ceil(this.data.length / this._itemsPerRow);
        this._canvasHeight = rowCount * this._itemHeight;
        const elementCount = Math.ceil(this._height / this._itemHeight + 2 * this.buffer) * this._itemsPerRow;

        const els = [];
        for (let i = 0; i < elementCount; i++) {
            els.push({ data: null, x: 0, y: 0, index: 0 });
        }
        this._elements = els;
        this._updateIndizes();
        this._updateElements();
    }

    private _updateIndizes() {
        const oldFirstIndex = this._firstIndex;
        const oldLastIndex = this._lastIndex;
        this._firstIndex = Math.max(
            Math.floor(this._scroller.scrollTop / this._itemHeight - this.buffer) * this._itemsPerRow,
            0
        );
        this._lastIndex = Math.min(this._firstIndex + this._elements.length, this.data.length) - 1;
        if (this._firstIndex !== oldFirstIndex || this._lastIndex !== oldLastIndex) {
            return this._updateElements();
        }
    }

    private _getItemPosition(i: number) {
        return {
            x: (i % this._itemsPerRow) * this._itemWidth,
            y: Math.floor(i / this._itemsPerRow) * this._itemHeight,
        };
    }

    private async _updateElements() {
        for (let i = this._firstIndex; i <= this._lastIndex; i++) {
            const elIndex = i % this._elements.length;
            const { x, y } = this._getItemPosition(i);
            Object.assign(this._elements[elIndex], {
                index: i,
                data: this.data[i],
                x,
                y,
            });
        }
        this.requestUpdate();
        await this.updateComplete;
        for (const cell of this._cells) {
            const index = cell.dataset.index!;
            const itemEl = this.itemSelector ? cell.querySelector(this.itemSelector) : cell.children[0];
            if (itemEl) {
                itemEl.setAttribute("aria-posinset", index);
                itemEl.setAttribute("aria-setsize", this.data.length.toString());
                itemEl.setAttribute("tabindex", Number(index) === this.focusedIndex ? "0" : "-1");
            }
        }
    }

    createRenderRoot() {
        return this;
    }

    static styles = [
        css`
            :host {
                position: relative;
            }

            ::slotted(.content) {
                position: relative;
            }

            ::slotted(.cell) {
                position: absolute;
                will-change: transform;
                transition: transform 0.5s;
            }
        `,
    ];

    render() {
        const { _itemWidth: w, _itemHeight: h } = this;
        const width = w === -1 ? "100%" : `${w}px`;
        return html`
            <pl-scroller class="fullbleed" role="presentation">
                <div class="content" style="position: relative; height: ${this._canvasHeight}px" role="presentation">
                    ${this._elements.map(({ x, y, data, index }) => {
                        const render = () => {
                            return data !== null
                                ? html`
                                      <div
                                          class="cell"
                                          style="position: absolute; will-change: transform; width: ${width}; height: ${h}px; transform: translate3d(${x}px, ${y}px, 0)"
                                          role="presentation"
                                          data-index=${index}
                                      >
                                          ${this.renderItem(data, index)}
                                      </div>
                                  `
                                : html``;
                        };

                        const deps = [x, y, data, w, h];
                        this.guard && data && deps.push(...this.guard(data));
                        return this.guard ? guard(deps, render) : render();
                    })}
                </div>
            </pl-scroller>
        `;
    }
}

@customElement("virtual-list-test")
export class VirtualListTest extends LitElement {
    data: { i: number }[] = [];

    constructor() {
        super();
        for (let i = 0; i < 10000; i++) {
            this.data.push({ i });
        }
    }

    static styles = [
        css`
            pl-virtual-list {
                ${mixins.fullbleed()};
                overflow-y: auto;
            }

            .item {
                border: solid 1px;
                margin: 5px;
                text-align: center;
                line-height: 90px;
            }
        `,
    ];

    render() {
        return html`
            <pl-virtual-list
                .data=${this.data}
                .minItemWidth=${200}
                .itemHeight=${100}
                .renderItem=${((item: { i: number }) => html` <div class="item">${item.i}</div> `) as any}
            ></pl-virtual-list>
        `;
    }
}
