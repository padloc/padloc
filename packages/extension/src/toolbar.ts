import { browser } from "webextension-polyfill-ts";
// import { totp } from "@padloc/core/src/otp";
// import { base32ToBytes } from "@padloc/core/src/encoding";
import { config } from "@padloc/app/src/styles";
import { BaseElement, html, property, css, element, query } from "@padloc/app/src/elements/base";
import { VaultItem } from "@padloc/core/src/item";
import { getPlatform } from "@padloc/core/src/platform";
import { throttle } from "@padloc/core/src/util";
import "@padloc/app/src/elements/icon";

@element("pl-extension-toolbar")
export class ExtensionToolbar extends BaseElement {
    @property()
    item: VaultItem | null = null;

    @property()
    private _fieldIndex = 0;

    @property()
    private _platform = "";

    @query(".usage-info")
    private _info: HTMLDivElement;

    private _hoveredInput: HTMLInputElement | null = null;

    private _highlightElement: HTMLDivElement;

    static styles = [
        config.cssVars,
        css`
            :host {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 9999999;
                display: flex;
                justify-content: center;
                align-items: flex-end;
                font-family: var(--font-family);
                padding: 10px;
                font-size: 14px;
                color: var(--color-secondary);
                pointer-events: none;
                will-change: transform;
                transform-origin: top right;
                transition: transform 0.5s;
                text-align: left;
            }

            :host(:not(.showing)) {
                transform: scale(0);
                transition: transform 0.5s;
            }

            :host(.dragging) {
                cursor: grabbing;
            }

            .inner {
                pointer-events: auto;
                min-width: 250px;
                max-width: 100%;
                position: relative;
            }

            .data {
                border-radius: var(--border-radius);
                background: var(--color-tertiary);
                box-shadow: rgba(0, 0, 0, 0.3) 0 0 20px -5px;
                padding: 4px;
            }

            .header {
                display: flex;
                align-items: center;
                margin-bottom: 4px;
            }

            .title {
                flex: 1;
                margin-right: 4px;
                font-weight: 600;
                font-size: 1.1em;
                padding: 6px 6px 0 6px;
            }

            .hint {
                opacity: 0.5;
                font-size: 0.9em;
                padding: 2px 6px 4px 6px;
            }

            .fields {
                display: flex;
                overflow-x: auto;
            }

            .key {
                background: rgba(0, 0, 0, 0.08);
                border: solid 1px rgba(0, 0, 0, 0.1);
                width: 1.5em;
                height: 1.5em;
                line-height: 1.6em;
                border-radius: 4px;
                border-bottom-width: 2px;
                font-size: 0.7em;
                text-align: center;
                display: inline-block;
            }

            .field {
                background: transparent;
                color: inherit;
                padding: 6px;
                cursor: grab;
                text-align: center;
                border-radius: var(--border-radius);
                display: flex;
                align-items: center;
                transition: background 0.3s, color 0.3s;
                flex: none;
                opacity: 0.999;
            }

            .field-index {
                margin-right: 0.5em;
            }

            .field:active {
                cursor: grabbing;
            }

            .field:not(:last-child) {
                margin-right: 4px;
            }

            .field:hover {
                /* box-shadow: rgba(0, 0, 0, 0.3) 0 0 4px; */
                background: var(--color-primary);
                color: var(--color-tertiary);
            }

            .field[active] {
                background: var(--color-primary);
                color: var(--color-tertiary);
            }

            .header button {
                background: transparent;
                color: inherit;
                font-family: inherit;
                font-size: inherit;
                font-weight: inherit;
                border: none;
                margin: 0;
                padding: 6px;
                cursor: pointer;
                text-align: center;
                outline: none;
                display: flex;
                align-items: center;
                padding: 0;
                font-size: 0.9em;
                border-radius: 100%;
                width: 2em;
                height: 2em;
                line-height: 2em;
                display: block;
            }

            .header button.close:hover {
                background: #eee;
            }

            .header button.close::before {
                font-family: "FontAwesome";
                content: "\\f00d";
            }

            .header button.info::before {
                font-family: "FontAwesome";
                font-size: 0.9em;
                content: "\\f129";
            }

            .header button.info:not(:hover) {
                opacity: 0.5;
            }

            .usage-info {
                position: absolute;
                width: 100%;
                top: 0;
                left: 0;
                background: #fafafa;
                border-radius: var(--border-radius) var(--border-radius) 0 0;
                box-shadow: rgba(0, 0, 0, 0.3) 0 0 10px -5px;
                z-index: -1;
                padding-bottom: 10px;
                will-change: transform;
                transition: transform 0.3s, opacity 0.3s;
                opacity: 0;
            }

            .usage-info.showing {
                transform: translate(0, calc(-100% + 10px));
                opacity: 1;
            }

            .usage-info ul {
                padding: 0 1em 0 2.5em;
                line-height: 2em;
            }

            .hand-icon::before {
                font-family: "FontAwesome";
                content: "\\f256";
            }
        `
    ];

    constructor() {
        super();
        // document.addEventListener("focusin", () => this._fillSelected());
        // document.addEventListener("focusout", () => (this._lastFilledInput = null));
        document.addEventListener("keydown", (e: KeyboardEvent) => this._keydown(e));
        // document.addEventListener("mousemove", (e: MouseEvent) => this._move(e));
        // document.addEventListener("dragenter", (e: DragEvent) => this._dragenter(e));
        document.addEventListener("dragover", (e: DragEvent) => this._dragover(e));
        // document.addEventListener("dragleave", (e: DragEvent) => this._dragleave(e));
        document.addEventListener("dragend", (e: DragEvent) => this._dragend(e));
        document.addEventListener(
            "drag",
            throttle((e: DragEvent) => this._drag(e), 50)
        );
        document.addEventListener("drop", (e: DragEvent) => this._drop(e));
        getPlatform()
            .getDeviceInfo()
            .then(info => (this._platform = info.platform));
    }

    async open(item: VaultItem, index?: number) {
        this.item = item;
        await this.updateComplete;
        this.classList.add("showing");
        if (typeof index === "number") {
            this._fillIndex(index);
        }
    }

    close() {
        this.classList.remove("showing");
        setTimeout(() => (this.item = null), 500);
    }

    private _getActiveElement(doc: DocumentOrShadowRoot): Element | null {
        const el = doc.activeElement;
        return (el && el.shadowRoot && this._getActiveElement(el.shadowRoot)) || el;
    }

    private _isElementFillable(el: Element) {
        return (
            el instanceof HTMLInputElement &&
            ["text", "number", "email", "password", "tel", "date", "month", "search", "url"].includes(el.type)
        );
    }

    private _getActiveInput(): HTMLInputElement | null {
        const el = this._getActiveElement(document);
        return el && this._isElementFillable(el) ? (el as HTMLInputElement) : null;
    }
    //
    // private async _fillSelected() {
    //     const input = this._getActiveInput();
    //
    //     if (!this.item || input === this._lastFilledInput) {
    //         return;
    //     }
    //
    //     const filled = await this._fillIndex(this._fieldIndex);
    //
    //     if (filled) {
    //         this._lastFilledInput = input;
    //         this._fieldIndex = (this._fieldIndex + 1) % this.item.fields.length;
    //     }
    // }

    private async _fillIndex(index: number, input: HTMLInputElement | null = this._getActiveInput()) {
        const field = this.item && this.item.fields[index];

        if (!field || !input) {
            return false;
        }

        // const value = field.type === "totp" ? await totp(base32ToBytes(field.value)) : field.value;
        const value =
            field.type === "totp"
                ? await browser.runtime.sendMessage({ type: "calcTOTP", secret: field.value })
                : field.value;

        input.value = value;
        input.dispatchEvent(
            new KeyboardEvent("keydown", {
                bubbles: true,
                key: ""
            })
        );
        input.dispatchEvent(
            new KeyboardEvent("keyup", {
                bubbles: true,
                key: ""
            })
        );
        input.dispatchEvent(
            new KeyboardEvent("keypress", {
                bubbles: true,
                key: ""
            })
        );
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        // setTimeout(() => input.blur(), 100);
        // input.select();
        // document.execCommand("paste");
        const button = this.$(`.fields > :nth-child(${index + 1})`);
        button && this._ripple(button);
        this._ripple(input);
        // setTimeout(() => this._ripple(input), 100);
        // setTimeout(() => this._ripple(input), 200);
        // this._fieldIndex = Math.min(this.item!.fields.length - 1, this._fieldIndex + 1);
        return true;
    }

    private _ripple(el: HTMLElement) {
        const { left, top, width, height } = el.getBoundingClientRect();
        const ripple = document.createElement("div");
        // const ripple = input.cloneNode(true) as HTMLElement;
        Object.assign(ripple.style, {
            left: left + "px",
            top: top + "px",
            width: width + "px",
            height: height + "px"
        });
        ripple.classList.add("ripple");
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 800);
    }

    private _highlight(el: HTMLElement | null) {
        if (this._highlightElement) {
            const hel = this._highlightElement;
            hel.classList.add("out");
            setTimeout(() => hel.remove(), 500);
        }

        if (el) {
            this._highlightElement = document.createElement("div");
            this._highlightElement.classList.add("highlight");
            document.body.appendChild(this._highlightElement);

            const { left, top, width, height } = el.getBoundingClientRect();
            Object.assign(this._highlightElement.style, {
                top: `${top}px`,
                left: `${left}px`,
                width: width + "px",
                height: height + "px",
                opacity: 1
            });
        }
    }

    private _keydown({ code, ctrlKey, metaKey, altKey }: KeyboardEvent) {
        if (code === "Escape") {
            this.close();
        }
        if (!this.item) {
            return;
        }

        const matchNumber = code.match(/Digit(\d)/);
        const index = (matchNumber && parseInt(matchNumber[1])) || NaN;
        if (!isNaN(index) && !!this.item.fields[index - 1]) {
            const input = this._getActiveInput();
            if ((ctrlKey || metaKey) && altKey && input) {
                this._fillIndex(index - 1);
            } else if (!input) {
                this._fieldIndex = index - 1;
            }
        }
    }

    private _dragstart(index: number) {
        this._fieldIndex = index;
        document.body.classList.add("dragging");
        this.classList.add("dragging");
    }

    private _getFillableFromPoint(
        root: Document | ShadowRoot,
        x: number,
        y: number,
        depth = 0
    ): HTMLInputElement | null {
        const els = root.elementsFromPoint(x, y);

        // Check all elements on this level first
        const input = els.find(el => this._isElementFillable(el));

        if (input) {
            return input as HTMLInputElement;
        }

        // If no fillable elements on this level were found, go one level deeper
        for (const el of els) {
            if (el !== this && el.shadowRoot && el.shadowRoot !== root) {
                const input = this._getFillableFromPoint(el.shadowRoot, x, y, depth + 1);
                if (input) {
                    return input;
                }
            }
        }

        // If nothing was found, return null
        return null;
    }

    private _drag(e: DragEvent) {
        e.preventDefault();
        const input = this._getFillableFromPoint(document, e.clientX, e.clientY);
        if (input !== this._hoveredInput) {
            this._highlight(input);
            this._hoveredInput = input;
        }
    }

    // private _dragenter(e: DragEvent) {
    //     const el = e.target as HTMLElement;
    //     if (this._isElementFillable(el)) {
    //         this._highlight(el);
    //     } else {
    //         this._highlight(null);
    //     }
    // }

    private _dragover(e: DragEvent) {
        e.preventDefault();
    }

    // private _dragleave(_e: DragEvent) {
    //     this._highlight(null);
    // }

    private _dragend(_e: DragEvent) {
        this._highlight(null);
        this._hoveredInput = null;
        document.body.classList.remove("dragging");
        this.classList.remove("dragging");
    }

    private _drop(_e: DragEvent) {
        // const el = e.target as HTMLElement;
        if (this._hoveredInput) {
            this._fillIndex(this._fieldIndex, this._hoveredInput);
        }
    }

    private _showInfo() {
        this._info.classList.add("showing");
    }

    private _hideInfo() {
        this._info.classList.remove("showing");
    }

    // private _move(e: MouseEvent) {
    //     console.log("move", e);
    //     console.log("hover", document.querySelectorAll("input:hover"));
    // }
    //
    // private _mousedown() {
    //     this.style.cursor = "grabbing";
    //     const handler = (e: MouseEvent) => this._move(e);
    //     document.addEventListener("mousemove", handler);
    //     document.addEventListener(
    //         "mouseup",
    //         () => {
    //             this.style.cursor = "";
    //             document.removeEventListener("mousemove", handler);
    //         },
    //         { once: true }
    //     );
    // }

    render() {
        if (!this.item) {
            return html``;
        }

        return html`
            <div class="inner">
                <div class="usage-info">
                    <ul>
                        <li>
                            <span class="hand-icon"></span>
                            &nbsp;<strong>Drag & Drop</strong> to fill
                        </li>

                        <li>
                            <div class="key">${this._platform === "MacOS" ? "⌘" : "⌃"}</div>
                            +
                            <div class="key">⌥</div>
                            +
                            <div class="key">n</div>
                            &nbsp;paste <strong>n</strong>th field
                        </li>

                        <li>
                            <div class="key">${this._platform === "MacOS" ? "⌘" : "⌃"}</div>
                            +
                            <div class="key">⇧</div>
                            +
                            <div class="key">→</div>
                            &nbsp;Open next item
                        </li>

                        <li>
                            <div class="key">${this._platform === "MacOS" ? "⌘" : "⌃"}</div>
                            +
                            <div class="key">⇧</div>
                            +
                            <div class="key">←</div>
                            &nbsp;Open prev. item
                        </li>

                        <li>
                            <div class="key">⎋</div>
                            &nbsp;Close item
                        </li>
                    </ul>
                </div>

                <div class="data">
                    <div class="header">
                        <div class="title">
                            ${this.item.name}
                        </div>
                        <button class="info" @mouseenter=${this._showInfo} @mouseleave=${this._hideInfo}></button>
                        <button class="close" @click=${this.close}></button>
                    </div>
                    <div class="fields">
                        ${this.item.fields.map(
                            (field, index) => html`
                                <div class="field" draggable="true" @dragstart=${() => this._dragstart(index)}>
                                    <div class="field-index key">
                                        ${index + 1}
                                    </div>
                                    <div class="field-name">
                                        ${field.name}
                                    </div>
                                </div>
                            `
                        )}
                    </div>
                </div>
            </div>
        `;
    }
}
