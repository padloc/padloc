import { TemplateResult } from "lit-html";
import { guard } from "lit-html/directives/guard";
import { BaseElement, element, property, html, css, observe, listen, query } from "./base";
import { mixins } from "../styles";
import { Scroller } from "./scroller";

@element("pl-virtual-list")
export class VirtualList<T> extends BaseElement {
    @property()
    data: T[] = [];

    @property()
    minItemWidth: number = -1;

    @property()
    itemHeight: number;

    @property()
    renderItem: (data: T) => TemplateResult;

    @property()
    buffer: number = 1;

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

    private _firstIndex: number;
    private _lastIndex: number;
    private _height: number;
    private _width: number;
    private _canvasHeight: number;
    private _itemWidth: number;
    private _itemsPerRow: number;

    private _elements: {
        data: T | null;
        x: number;
        y: number;
    }[] = [];

    firstUpdated() {
        this._scroller.addEventListener("scroll", () => this._updateIndizes(), { passive: true });
        this._updateBounds();
    }

    @observe("data", "itemMinWidth", "minItemWidth", "itemHeight")
    @listen("resize", window)
    _updateBounds() {
        const { width, height } = this.getBoundingClientRect();
        this._width = width;
        this._height = height;
        this._itemsPerRow = this.minItemWidth === -1 ? 1 : Math.floor(this._width / (this.minItemWidth || this._width));
        this._itemWidth = this._itemsPerRow > 1 ? this._width / this._itemsPerRow : -1;
        const rowCount = Math.ceil(this.data.length / this._itemsPerRow);
        this._canvasHeight = rowCount * this.itemHeight;
        const elementCount = Math.ceil(this._height / this.itemHeight + 2 * this.buffer) * this._itemsPerRow;

        const els = [];
        for (let i = 0; i < elementCount; i++) {
            els.push({ data: null, x: 0, y: 0 });
        }
        this._elements = els;
        this._updateIndizes();
        this._updateElements();
    }

    _updateIndizes() {
        const oldFirstIndex = this._firstIndex;
        const oldLastIndex = this._lastIndex;
        this._firstIndex = Math.max(
            Math.floor(this._scroller.scrollTop / this.itemHeight - this.buffer) * this._itemsPerRow,
            0
        );
        this._lastIndex = Math.min(this._firstIndex + this._elements.length, this.data.length) - 1;
        if (this._firstIndex !== oldFirstIndex || this._lastIndex !== oldLastIndex) {
            this._updateElements();
        }
    }

    _updateElements() {
        for (let i = this._firstIndex; i <= this._lastIndex; i++) {
            const elIndex = i % this._elements.length;
            Object.assign(this._elements[elIndex], {
                data: this.data[i],
                x: (i % this._itemsPerRow) * this._itemWidth,
                y: Math.floor(i / this._itemsPerRow) * this.itemHeight,
            });
        }
        this.requestUpdate();
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
        const { _itemWidth: w, itemHeight: h } = this;
        const width = w === -1 ? "100%" : `${w}px`;
        return html`
            <pl-scroller class="fullbleed">
                <div class="content" style="position: relative; height: ${this._canvasHeight}px">
                    ${this._elements.map(({ x, y, data }) => {
                        const render = () => {
                            return data !== null
                                ? html`
                                      <div
                                          class="cell"
                                          style="position: absolute; will-change: transform; width: ${width}; height: ${h}px; transform: translate3d(${x}px, ${y}px, 0)"
                                      >
                                          ${this.renderItem(data)}
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

@element("virtual-list-test")
export class VirtualListTest extends BaseElement {
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
                ${mixins.fullbleed()}
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
                .renderItem=${(item: { i: number }) => html` <div class="item">${item.i}</div> `}
            ></pl-virtual-list>
        `;
    }
}
