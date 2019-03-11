import { shared, mixins } from "../styles";
import { animateElement } from "../animation";
import { BaseElement, html, property, observe, listen } from "./base.js";
import { Input } from "./input.js";

export class Dialog<I, R> extends BaseElement {
    @property()
    open: boolean = false;
    @property()
    preventDismiss: boolean = false;

    isShowing: boolean = false;
    private _hideTimeout?: number;
    private _resolve: ((result?: R) => void) | null;

    protected done(result?: R) {
        this._resolve && this._resolve(result);
        this._resolve = null;
        this.open = false;
    }

    async show(_input: I = (undefined as any) as I) {
        this.open = true;

        return new Promise<R>(resolve => {
            this._resolve = resolve;
        });
    }

    render() {
        return html`
            ${shared}

            <style>

                :host {
                    display: block;
                    ${mixins.fullbleed()}
                    position: fixed;
                    z-index: 10;
                    ${mixins.scroll()}
                }

                :host(:not([open])) {
                    pointer-events: none;
                }

                .outer {
                    min-height: 100%;
                    display: flex;
                    position: relative;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 10px;
                    box-sizing: border-box;
                }

                .scrim {
                    display: block;
                    background: #000000;
                    opacity: 0;
                    transition: opacity 400ms cubic-bezier(0.6, 0, 0.2, 1);
                    transform: translate3d(0, 0, 0);
                    ${mixins.fullbleed()}
                    position: fixed;
                }

                :host([open]) .scrim {
                    opacity: 0.8;
                }

                .inner {
                    position: relative;
                    width: 100%;
                    box-sizing: border-box;
                    max-width: var(--pl-dialog-max-width, 400px);
                    z-index: 1;
                    border-radius: var(--border-radius);
                    box-shadow: rgba(0, 0, 0, 0.25) 0 0 5px;
                    overflow: hidden;
                    background: var(--color-tertiary);
                }

                .outer {
                    transform: translate3d(0, 0, 0);
                    /* transition: transform 400ms cubic-bezier(1, -0.3, 0, 1.3), opacity 400ms cubic-bezier(0.6, 0, 0.2, 1); */
                    transition: transform 400ms cubic-bezier(0.6, 0, 0.2, 1), opacity 400ms cubic-bezier(0.6, 0, 0.2, 1);
                }

                .actions {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
                    grid-gap: var(--gutter-size);
                    margin: var(--gutter-size);
                }

                .actions.vertical {
                    grid-template-columns: 1fr;
                }

                :host(:not([open])) .outer {
                    opacity: 0;
                    transform: translate3d(0, 0, 0) scale(0.8);
                }
            </style>

            <div class="scrim"></div>

            <div class="outer" @click=${() => this.dismiss()}>
                ${this.renderBefore()}
                <div id="inner" class="inner" @click=${(e: Event) => e.stopPropagation()}>
                    ${this.renderContent()}
                </div>
                ${this.renderAfter()}
            </div>
        `;
    }

    protected renderBefore() {
        return html`
            <slot name="before"></slot>
        `;
    }

    protected renderContent() {
        return html`
            <slot></slot>
        `;
    }

    protected renderAfter() {
        return html`
            <slot name="after"></slot>
        `;
    }

    @listen("backbutton", window)
    _back(e: Event) {
        if (this.open) {
            this.dismiss();
            e.preventDefault();
            e.stopPropagation();
        }
    }

    rumble() {
        animateElement(this.$("#inner"), { animation: "rumble", duration: 200, clear: true });
    }

    @observe("open")
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

        this.dispatch(this.open ? "dialog-open" : "dialog-close", { dialog: this }, true, true);
    }

    dismiss() {
        if (!this.preventDismiss) {
            this.dispatch("dialog-dismiss");
            this.done();
        }
    }
}

window.customElements.define("pl-dialog", Dialog);
