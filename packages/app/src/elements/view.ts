import { css, LitElement } from "lit";
import { property } from "lit/decorators.js";
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
