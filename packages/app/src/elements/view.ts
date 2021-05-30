import { css, LitElement } from "lit";
import { property } from "lit/decorators";
import { shared } from "../styles";

export class View extends LitElement {
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

    @property({ type: Boolean })
    active: boolean = false;

    updated(changes: Map<string, any>) {
        if (changes.has("active")) {
            if (this.active) {
                this._activated();
            } else {
                this._deactivated();
            }
        }
    }

    protected _activated() {}

    protected _deactivated() {}
}
