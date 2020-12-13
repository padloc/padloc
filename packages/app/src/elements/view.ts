import { BaseElement, property, observe, css } from "./base";
import { shared } from "../styles";

export class View extends BaseElement {
    static styles = [
        shared,
        css`
            :host {
                display: block;
                position: relative;
                background: var(--color-background);
            }

            @supports (-webkit-overflow-scrolling: touch) {
                header {
                    padding-top: max(env(safe-area-inset-top), 8px);
                }
            }
        `,
    ];

    @property()
    active: boolean = false;

    @observe("active")
    _activeChanged() {
        if (this.active) {
            this._activated();
        } else {
            this._deactivated();
        }
    }

    protected _activated() {}

    protected _deactivated() {}
}
