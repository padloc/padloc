import { BaseElement, property, observe, css } from "./base";
import { shared } from "../styles";

export class View extends BaseElement {
    static styles = [
        shared,
        css`
            @supports (-webkit-overflow-scrolling: touch) {
                header {
                    padding-top: max(env(safe-area-inset-top), 8px);
                }

                .fabs {
                    margin: calc(env(safe-area-inset-bottom) / 3);
                }
            }
        `
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
