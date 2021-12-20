import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { shared } from "../styles";

type PopoverAlignment =
    | "bottom"
    | "bottom-left"
    | "bottom-right"
    | "right"
    | "right-top"
    | "right-bottom"
    | "top"
    | "top-left"
    | "top-right"
    | "left"
    | "left-top"
    | "left-bottom"
    | "auto";

interface Position {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

const ALIGNMENTS: PopoverAlignment[] = [
    "bottom",
    "right",
    "top",
    "left",
    "bottom-left",
    "bottom-right",
    "right-top",
    "right-bottom",
    "top-left",
    "top-right",
    "left-top",
    "left-bottom",
];

@customElement("pl-popover")
export class Popover extends LitElement {
    @property({ reflect: true })
    anchor: string | HTMLElement = ":previous";

    @property()
    trigger: "click" | "hover" | "focus" = "click";

    @property()
    alignment: PopoverAlignment = "auto";

    @property()
    preferAlignment: string | string[] = "bottom";

    @property({ type: Boolean, attribute: "hide-on-click" })
    hideOnClick = false;

    @property({ type: Boolean, attribute: "hide-on-leave" })
    hideOnLeave = false;

    get showing() {
        return this.classList.contains("showing");
    }

    private _anchorElement: HTMLElement;
    private _mutationObserver = new MutationObserver(() => this._contentChanged());

    private _clickHandler = () => this._click();
    private _selfClickHandler = () => this._selfClick();
    private _documentClickHandler = () => this._documentClick();
    private _mouseenterHandler = () => this._mouseenter();
    private _mouseleaveHandler = () => this._mouseleave();
    private _focusHandler = () => this._focus();
    private _blurHandler = () => this._blur();
    private _selfMouseleaveHandler = () => this._selfMouseleave();

    private _ignoreNextClick = false;
    private _keepOpenUntilClick = false;

    private _hideTimeout: number;

    connectedCallback() {
        super.connectedCallback();
        this.style.display = "none";
        if (this.anchor === ":previous") {
            this._anchorElement = this.previousElementSibling as HTMLElement;
        } else if (typeof this.anchor === "string") {
            const root = this.getRootNode() as HTMLElement;
            this._anchorElement = root.querySelector(this.anchor) as HTMLElement;
        } else {
            this._anchorElement = this.anchor;
        }
        this._addListeners();
    }

    disconnectedCallback() {
        this._removeListeners();
    }

    show(ingoreNextClick = false) {
        this._keepOpenUntilClick = true;
        if (ingoreNextClick) {
            this._ignoreNextClick = true;
        }
        this._show();
    }

    hide() {
        this._keepOpenUntilClick = this._ignoreNextClick = false;
        this.classList.remove("showing");
        clearTimeout(this._hideTimeout);
        this._hideTimeout = window.setTimeout(() => (this.style.display = "none"), 300);
    }

    align() {
        const alignment = this.alignment === "auto" ? this._getAutoAlignment() : this.alignment;
        const pos = this._getPosition(alignment);
        Object.assign(this.style, { top: `${pos.top}px`, left: `${pos.left}px` });

        ALIGNMENTS.forEach((a) => this.classList.toggle(a, a === alignment));
    }

    private _selfClick() {
        if (!this.hideOnClick) {
            this._ignoreNextClick = true;
        }
    }

    private _click() {
        this._ignoreNextClick = true;
        this._show();
    }

    private _documentClick() {
        if (this.trigger === "click" && !this._ignoreNextClick) {
            this.hide();
            this._keepOpenUntilClick = false;
        }
        this._ignoreNextClick = false;
    }

    private _mouseenter() {
        this._show();
    }

    private _mouseleave() {
        if (!this._keepOpenUntilClick) {
            this.hide();
        }
    }

    private _selfMouseleave() {
        if (this.hideOnLeave) {
            this.hide();
        }
    }

    private _focus() {
        this._show();
    }

    private _blur() {
        this.hide();
    }

    private _show() {
        clearTimeout(this._hideTimeout);
        this.style.display = "";
        this.offsetLeft;
        this.align();
        this.classList.add("showing");
    }

    private _getAutoAlignment(): PopoverAlignment {
        const preferred = (
            Array.isArray(this.preferAlignment) ? [...this.preferAlignment] : [this.preferAlignment]
        ).reverse();
        const alignments = [...ALIGNMENTS].sort((a, b) => preferred.indexOf(b) - preferred.indexOf(a));
        return alignments.find((alignment) => this._isWithinBounds(this._getPosition(alignment))) || alignments[0];
    }

    private _getPosition(alignment: PopoverAlignment): Position {
        const pos = { top: 0, left: 0, bottom: 0, right: 0 };

        if (!this._anchorElement) {
            return pos;
        }

        const {
            top: anchorTop,
            left: anchorLeft,
            height: anchorHeight,
            width: anchorWidth,
        } = this._anchorElement.getBoundingClientRect();
        const { width: ownWidth, height: ownHeight } = this.getBoundingClientRect();
        const offset = 26;

        switch (alignment) {
            case "bottom":
                pos.top = anchorTop + anchorHeight;
                pos.left = anchorLeft + anchorWidth / 2 - ownWidth / 2;
                break;
            case "bottom-left":
                pos.top = anchorTop + anchorHeight;
                pos.left = anchorLeft + anchorWidth / 2 - ownWidth + offset;
                break;
            case "bottom-right":
                pos.top = anchorTop + anchorHeight;
                pos.left = anchorLeft + anchorWidth / 2 - offset;
                break;
            case "right":
                pos.left = anchorLeft + anchorWidth;
                pos.top = anchorTop + anchorHeight / 2 - ownHeight / 2;
                break;
            case "right-top":
                pos.left = anchorLeft + anchorWidth;
                pos.top = anchorTop + anchorHeight / 2 - ownHeight + offset;
                break;
            case "right-bottom":
                pos.left = anchorLeft + anchorWidth;
                pos.top = anchorTop + anchorHeight / 2 - offset;
                break;
            case "top":
                pos.top = anchorTop - ownHeight;
                pos.left = anchorLeft + anchorWidth / 2 - ownWidth / 2;
                break;
            case "top-left":
                pos.top = anchorTop - ownHeight;
                pos.left = anchorLeft + anchorWidth / 2 - ownWidth + offset;
                break;
            case "top-right":
                pos.top = anchorTop - ownHeight;
                pos.left = anchorLeft + anchorWidth / 2 - offset;
                break;
            case "left":
                pos.left = anchorLeft - ownWidth;
                pos.top = anchorTop + anchorHeight / 2 - ownHeight / 2;
                break;
            case "left-top":
                pos.left = anchorLeft - ownWidth;
                pos.top = anchorTop + anchorHeight / 2 - ownHeight + offset;
                break;
            case "left-bottom":
                pos.left = anchorLeft - ownWidth;
                pos.top = anchorTop + anchorHeight / 2 - offset;
                break;
        }

        pos.right = pos.left + ownWidth;
        pos.bottom = pos.top + ownHeight;

        return pos;
    }

    private _isWithinBounds({ top, right, bottom, left }: Position) {
        const { clientWidth, clientHeight } = document.documentElement;
        return top > 0 && left > 0 && right < clientWidth && bottom < clientHeight;
    }

    private _contentChanged() {
        if (this.showing) {
            this.align();
        }
    }

    private _addListeners() {
        switch (this.trigger) {
            case "click":
                this._anchorElement.addEventListener("click", this._clickHandler);
                break;
            case "hover":
                this._anchorElement.addEventListener("mouseenter", this._mouseenterHandler);
                this._anchorElement.addEventListener("mouseleave", this._mouseleaveHandler);
                this.addEventListener("mouseenter", this._mouseenterHandler);
                this.addEventListener("mouseleave", this._mouseleaveHandler);
                break;
            case "focus":
                this._anchorElement.addEventListener("focusin", this._focusHandler);
                this._anchorElement.addEventListener("focusout", this._blurHandler);
                this.addEventListener("focusin", this._focusHandler);
                this.addEventListener("focusout", this._blurHandler);
                break;
        }

        this.addEventListener("click", this._selfClickHandler);
        document.addEventListener("click", this._documentClickHandler);
        this.addEventListener("mouseleave", this._selfMouseleaveHandler);

        this._mutationObserver.observe(this, { childList: true, subtree: true });
    }

    private _removeListeners() {
        this._anchorElement.removeEventListener("click", this._clickHandler);
        document.removeEventListener("click", this._documentClickHandler);
        this._anchorElement.removeEventListener("mouseenter", this._mouseenterHandler);
        this._anchorElement.removeEventListener("mouseleave", this._mouseleaveHandler);
        this.removeEventListener("mouseenter", this._mouseenterHandler);
        this.removeEventListener("mouseleave", this._mouseleaveHandler);
        this.removeEventListener("mouseleave", this._selfMouseleaveHandler);
        this.removeEventListener("click", this._selfClickHandler);
        this._anchorElement.removeEventListener("focusin", this._focusHandler);
        this._anchorElement.removeEventListener("focusout", this._blurHandler);
        this.removeEventListener("focusin", this._focusHandler);
        this.removeEventListener("focusout", this._blurHandler);

        this._mutationObserver.disconnect();
    }

    static styles = [
        shared,
        css`
            :host {
                position: fixed;
                display: block;
                overflow: visible;
                z-index: 10;
                transition: transform 0.3s, opacity 0.3s;

                /* POPOVERS */

                background: var(--color-background-dark);
                border-radius: 0.5em;
                box-shadow: rgba(0, 0, 0, 0.1) 0 0.3em 1em -0.2em, var(--border-color) 0 0 0 1px;
            }

            .arrow {
                position: absolute;
                margin: auto;
                width: 12px;
                height: 12px;
                background: inherit;
                transform: rotate(45deg);
                z-index: -1;
            }

            :host(.bottom) .arrow {
                box-shadow: var(--border-color) -1px -1px 0 0;
                left: 0;
                right: 0;
                top: -6px;
                border-top-left-radius: 2px;
            }

            :host(.bottom-left) .arrow {
                box-shadow: var(--border-color) -1px -1px 0 0;
                right: 20px;
                top: -6px;
                border-top-left-radius: 2px;
            }

            :host(.bottom-right) .arrow {
                box-shadow: var(--border-color) -1px -1px 0 0;
                left: 20px;
                top: -6px;
                border-top-left-radius: 2px;
            }

            :host(.right) .arrow {
                box-shadow: var(--border-color) -1px 1px 0 0;
                top: 0;
                bottom: 0;
                left: -6px;
                border-bottom-left-radius: 2px;
            }

            :host(.right-top) .arrow {
                box-shadow: var(--border-color) -1px 1px 0 0;
                bottom: 20px;
                left: -6px;
                border-bottom-left-radius: 2px;
            }

            :host(.right-bottom) .arrow {
                box-shadow: var(--border-color) -1px 1px 0 0;
                top: 20px;
                left: -6px;
                border-bottom-left-radius: 2px;
            }

            :host(.top) .arrow {
                box-shadow: var(--border-color) 1px 1px 0 0;
                left: 0;
                right: 0;
                bottom: -6px;
                border-bottom-right-radius: 2px;
            }

            :host(.top-left) .arrow {
                box-shadow: var(--border-color) 1px 1px 0 0;
                right: 20px;
                bottom: -6px;
                border-bottom-right-radius: 2px;
            }

            :host(.top-right) .arrow {
                box-shadow: var(--border-color) 1px 1px 0 0;
                left: 20px;
                bottom: -6px;
                border-bottom-right-radius: 2px;
            }

            :host(.left) .arrow {
                box-shadow: var(--border-color) 1px -1px 0 0;
                top: 0;
                bottom: 0;
                right: -6px;
                border-top-right-radius: 2px;
            }

            :host(.left-top) .arrow {
                box-shadow: var(--border-color) 1px -1px 0 0;
                bottom: 20px;
                right: -6px;
                border-top-right-radius: 2px;
            }

            :host(.left-bottom) .arrow {
                box-shadow: var(--border-color) 1px -1px 0 0;
                top: 20px;
                right: -6px;
                border-top-right-radius: 2px;
            }

            :host(:not(.showing)) {
                pointer-events: none;
                opacity: 0;
            }

            :host([class^="bottom"]:not(.showing)),
            :host([class*=" bottom"]:not(.showing)) {
                transform: translate(0, 10px);
            }

            :host([class^="top"]:not(.showing)),
            :host([class*=" top"]:not(.showing)) {
                transform: translate(0, -10px);
            }

            :host([class^="left"]:not(.showing)),
            :host([class*=" left"]:not(.showing)) {
                transform: translate(-10px, 0);
            }

            :host([class^="right"]:not(.showing)),
            :host([class*=" right"]:not(.showing)) {
                transform: translate(10px, 0);
            }
        `,
    ];

    render() {
        return html`
            <div class="arrow"></div>
            <slot></slot>
        `;
    }
}
