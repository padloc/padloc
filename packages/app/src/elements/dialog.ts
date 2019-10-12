import { shared, mixins } from "../styles";
import { animateElement } from "../lib/animation";
import { BaseElement, element, html, css, property, observe, listen } from "./base";
import { Input } from "./input";

@element("pl-dialog")
export class Dialog<I, R> extends BaseElement {
    static openDialogs = new Set<Dialog<any, any>>();

    static closeAll() {
        for (const dialog of Dialog.openDialogs) {
            if (!dialog.preventAutoClose) {
                dialog.done();
            }
        }
    }

    @property()
    open: boolean = false;
    @property()
    preventDismiss: boolean = false;
    @property()
    preventAutoClose: boolean = false;

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

        return new Promise<R>(resolve => {
            this._resolve = resolve;
        });
    }

    static styles = [
        shared,
        css`
            :host {
                display: block;
                ${mixins.fullbleed()}
                z-index: 10;
            }

            :host(:not([open])) {
                pointer-events: none;
            }

            .outer {
                height: 100%;
                display: flex;
                position: relative;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 12px;
                box-sizing: border-box;
                perspective: 1000px;
                transition: transform 400ms cubic-bezier(0.08, 0.85, 0.3, 1.15) 0s,
                    opacity 200ms cubic-bezier(0.6, 0, 0.2, 1) 0s;
            }

            .scrim {
                display: block;
                background: #000000;
                opacity: 0;
                transition: opacity 400ms cubic-bezier(0.6, 0, 0.2, 1);
                ${mixins.fullbleed()}
                position: fixed;
            }

            :host([open]) .scrim {
                opacity: 0.8;
            }

            .inner {
                position: relative;
                width: 100%;
                max-height: 100%;
                box-sizing: border-box;
                max-width: var(--pl-dialog-max-width, 400px);
                z-index: 1;
                border-radius: var(--border-radius);
                box-shadow: rgba(0, 0, 0, 0.25) 0 0 5px;
                overflow: hidden;
                background: var(--color-tertiary);
                display: flex;
                flex-direction: column;
            }

            .content {
                flex: 1;
                ${mixins.scroll()}
            }

            .actions {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                grid-gap: var(--gutter-size);
                margin: var(--gutter-size);
            }

            .actions.vertical {
                grid-template-columns: 1fr;
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
        `
    ];

    render() {
        return html`
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
