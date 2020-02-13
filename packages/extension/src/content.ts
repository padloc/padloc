import "@webcomponents/webcomponentsjs";
import { browser } from "webextension-polyfill-ts";
import { throttle } from "@padloc/core/src/util";
import { Message } from "./message";

const css = `
    @font-face {
        font-family: "Nunito";
        font-style: normal;
        font-weight: 400;
        src: url("${browser.runtime.getURL("Nunito-Regular.ttf")}") format("truetype");
    }

    @font-face {
        font-family: "Nunito";
        font-style: normal;
        font-weight: 600;
        src: url("${browser.runtime.getURL("Nunito-SemiBold.ttf")}") format("truetype");
    }

    @font-face {
        font-family: "FontAwesome";
        src: url("${browser.runtime.getURL("fontawesome-webfont.ttf")}") format("truetype");
        font-weight: normal;
        font-style: normal;
    }

    @keyframes ripple {
        from {
            opacity: 0.3;
            transform: scale(1);
        }

        to {
            opacity: 0;
            transform: scale(2);
        }
    }

    @keyframes highlight {
        from {
            opacity: 0;
            transform: scale(1.1);
        }

        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    .ripple {
        position: absolute;
        z-index: 9999999;
        border-radius: 8px;
        background: #3bb7f9;
        animation: ripple 0.8s both;
        pointer-events: none;
        will-change: transform, opacity;
    }

    .highlight {
        position: absolute;
        left: 0;
        top: 0;
        z-index: 9999999;
        border-radius: 8px;
        border: solid 2px #3bb7f9;
        box-sizing: border-box;
        pointer-events: none;
        will-change: transform, width, height, opacity;
        animation: highlight 0.3s both;
    }

    .highlight.out {
        animation-direction: reverse;
    }

    .drag-element {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 9999999;
        border-radius: 8px;
        background: #3bb7f9;
        color: white;
        padding: 6px;
        cursor: grabbing;
        will-change: transform;
        font-family: "Nunito";
        font-size: 14px;
    }

    body.dragging {
        cursor: grabbing !important;
    }
`;

class ExtensionContent {
    private _hoveredInput: HTMLInputElement | null = null;

    private _highlightElement: HTMLDivElement;

    async init() {
        const style = document.createElement("style");
        document.head.appendChild(style);
        style.type = "text/css";
        style.appendChild(document.createTextNode(css));
        browser.runtime.onMessage.addListener((msg: Message) => this._handleMessage(msg));
    }

    private _handleMessage(msg: Message) {
        switch (msg.type) {
            case "fillActive":
                // console.log("autofill", msg);
                return Promise.resolve(this._fill(msg.value));
            case "fillOnDrop":
                // console.log("autofill", msg);
                return new Promise(resolve => {
                    let timeout: number;

                    const dragover = (e: DragEvent) => {
                        // console.log("dragover", performance.now());
                        if (timeout) {
                            clearTimeout(timeout);
                        }
                        this._updateHovered(e);
                    };

                    const dragleave = () => {
                        // console.log("dragleave", performance.now());
                        timeout = window.setTimeout(() => {
                            if (this._hoveredInput) {
                                resolve(this._fill(msg.value, this._hoveredInput));
                            } else {
                                resolve(false);
                            }

                            this._highlight(null);
                            this._hoveredInput = null;
                            document.removeEventListener("dragover", dragover);
                            document.removeEventListener("dragleave", dragleave);
                        }, 100);
                    };

                    document.addEventListener("dragover", dragover);
                    document.addEventListener("dragleave", dragleave);
                });
            case "hasActiveInput":
                const activeInput = this._getActiveInput();
                // console.log("has active input", activeInput);
                return Promise.resolve(!!activeInput);
            case "isContentReady":
                return Promise.resolve(true);
        }
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

    private async _fill(value: string, input: HTMLInputElement | null = this._getActiveInput()) {
        if (!input) {
            return false;
        }

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
        this._ripple(input);
        return true;
    }

    private _ripple(el: HTMLElement) {
        const { left, top, width, height } = el.getBoundingClientRect();
        const ripple = document.createElement("div");
        const { scrollTop, scrollLeft } = document.documentElement;
        Object.assign(ripple.style, {
            top: `${top + scrollTop}px`,
            left: `${left + scrollLeft}px`,
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
            const { scrollTop, scrollLeft } = document.documentElement;
            Object.assign(this._highlightElement.style, {
                top: `${top + scrollTop}px`,
                left: `${left + scrollLeft}px`,
                width: width + "px",
                height: height + "px",
                opacity: 1
            });
        }
    }

    // private _keydown({ code, ctrlKey, metaKey, altKey }: KeyboardEvent) {
    //     if (code === "Escape") {
    //         this.close();
    //     }
    //     if (!this._item) {
    //         return;
    //     }
    //
    //     const matchNumber = code.match(/Digit(\d)/);
    //     const index = (matchNumber && parseInt(matchNumber[1])) || NaN;
    //     if (!isNaN(index) && !!this._item.fields[index - 1]) {
    //         const input = this._getActiveInput();
    //         if ((ctrlKey || metaKey) && altKey && input) {
    //             this._fillIndex(index - 1);
    //         } else if (!input) {
    //             this._fieldIndex = index - 1;
    //         }
    //     }
    // }
    //
    // private _dragstart(index: number) {
    //     this._fieldIndex = index;
    //     document.body.classList.add("dragging");
    //     this.classList.add("dragging");
    // }

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
            if (el.shadowRoot && el.shadowRoot !== root) {
                const input = this._getFillableFromPoint(el.shadowRoot, x, y, depth + 1);
                if (input) {
                    return input;
                }
            }
        }

        // If nothing was found, return null
        return null;
    }

    private _updateHovered = throttle((e: DragEvent) => {
        // console.log("update hovered", performance.now());
        const input = this._getFillableFromPoint(document, e.clientX, e.clientY);
        if (input !== this._hoveredInput) {
            this._highlight(input);
            this._hoveredInput = input;
        }
    }, 50);
}

if (typeof window.extension === "undefined") {
    window.extension = new ExtensionContent();
    window.extension.init();
}
