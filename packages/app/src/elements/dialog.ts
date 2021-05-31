import { shared, mixins } from "../styles";
import { animateElement } from "../lib/animation";
import { Input } from "./input";
import { customElement } from "@lit/reactive-element/decorators/custom-element";
import { css, html, LitElement } from "lit";
import { property, query } from "lit/decorators.js";

@customElement("pl-dialog")
export class Dialog<I, R> extends LitElement {
    static openDialogs = new Set<Dialog<any, any>>();

    static closeAll() {
        for (const dialog of Dialog.openDialogs) {
            if (!dialog.preventAutoClose) {
                dialog.done();
            }
        }
    }

    @property({ type: Boolean })
    open: boolean = false;

    @property({ type: Boolean })
    preventDismiss: boolean = false;

    @property({ type: Boolean })
    preventAutoClose: boolean = false;

    @property({ type: Boolean })
    dismissOnTapOutside: boolean = true;

    @query(".inner")
    private _inner: HTMLDivElement;

    readonly hideApp: boolean = false;

    isShowing: boolean = false;
    private _hideTimeout?: number;
    private _resolve: ((result?: R) => void) | null;

    protected done(result?: R) {
        this._resolve && this._resolve(result);
        this._resolve = null;
        this.open = false;
        Dialog.openDialogs.delete(this);
    }

    async show(_input: I = (undefined as any) as I) {
        Dialog.openDialogs.add(this);
        this.open = true;

        return new Promise<R>((resolve) => {
            this._resolve = resolve as (r?: R) => void;
        });
    }

    static styles = [
        shared,
        css`
            :host {
                display: block;
                ${mixins.fullbleed()};
                z-index: 10;
                --spacing: 0.6em;
            }

            :host(:not([open])) {
                pointer-events: none;
            }

            .outer {
                padding: 0.5em;
                box-sizing: border-box;
                transition: transform 400ms cubic-bezier(0.08, 0.85, 0.3, 1.15) 0s,
                    opacity 200ms cubic-bezier(0.6, 0, 0.2, 1) 0s;
            }

            .scrim {
                display: block;
                background: #000000;
                opacity: 0;
                transition: opacity 400ms cubic-bezier(0.6, 0, 0.2, 1);
                ${mixins.fullbleed()};
                position: fixed;
            }

            :host([open]) .scrim {
                opacity: 0.8;
            }

            .inner {
                position: relative;
                width: 100%;
                height: auto;
                max-height: 100%;
                box-sizing: border-box;
                max-width: var(--pl-dialog-max-width, 400px);
                z-index: 1;
                border-radius: 1em;
                box-shadow: rgba(0, 0, 0, 0.25) 0 0 5px;
                background: var(--color-background);
                display: flex;
                flex-direction: column;
            }

            :host(:not([open])) .outer {
                opacity: 0;
                transform: scale(0.8);
                transition: transform 200ms cubic-bezier(0.6, 0, 0.2, 1), opacity 200ms cubic-bezier(0.6, 0, 0.2, 1);
            }

            @supports (-webkit-overflow-scrolling: touch) {
                .outer {
                    padding-top: max(env(safe-area-inset-top), 12px);
                    padding-bottom: max(env(safe-area-inset-bottom), 12px);
                }
            }
        `,
    ];

    render() {
        return html`
            <div class="scrim"></div>

            <div class="fullbleed centering layout outer" @click=${this._tappedOutside}>
                ${this.renderBefore()}
                <div id="inner" class="inner" @click=${(e: Event) => e.stopPropagation()}>${this.renderContent()}</div>
                ${this.renderAfter()}
            </div>
        `;
    }

    protected renderBefore() {
        return html` <slot name="before"></slot> `;
    }

    protected renderContent() {
        return html` <slot></slot> `;
    }

    protected renderAfter() {
        return html` <slot name="after"></slot> `;
    }

    _back(e: Event) {
        if (this.open) {
            this.dismiss();
            e.preventDefault();
            e.stopPropagation();
        }
    }

    connectedCallback() {
        super.connectedCallback();
        window.addEventListener("backbutton", (e: Event) => this._back(e));
    }

    rumble() {
        animateElement(this._inner, { animation: "rumble", duration: 200, clear: true });
    }

    updated(changes: Map<string, any>) {
        if (changes.has("open")) {
            this._openChanged();
        }
    }

    _openChanged() {
        clearTimeout(this._hideTimeout);

        // Set _display: block_ if we're showing. If we're hiding
        // we need to wait until the transitions have finished before we
        // set _display: none_.
        if (this.open) {
            if (Input.activeInput) {
                Input.activeInput.blur();
            }
            this.style.display = "";
            this.offsetLeft;
            this.isShowing = true;
            this.setAttribute("open", "");
        } else {
            this.removeAttribute("open");
            this._hideTimeout = window.setTimeout(() => {
                this.style.display = "none";
                this.isShowing = false;
            }, 400);
        }

        this.dispatchEvent(
            new CustomEvent(this.open ? "dialog-open" : "dialog-close", {
                detail: { dialog: this },
                composed: true,
                bubbles: true,
            })
        );
    }

    private _tappedOutside() {
        if (this.dismissOnTapOutside) {
            this.dismiss();
        }
    }

    dismiss() {
        if (!this.preventDismiss) {
            this.dispatchEvent(new CustomEvent("dialog-dismiss", { bubbles: true, composed: true }));
            this.done();
        }
    }
}
