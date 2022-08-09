import { mixins } from "../styles";
import { Dialog } from "./dialog";
import "./icon";
import { css, html } from "lit";
import { customElement, query } from "lit/decorators.js";
import "./button";
import "./rich-input";
import { RichInput } from "./rich-input";
// import { VaultItem } from "./vault-item";
// import { View } from "./view";

@customElement("pl-note-dialog")
export class NoteDialog extends Dialog<string, string> {
    @query("pl-rich-input")
    _input: RichInput;

    static styles = [
        ...Dialog.styles,
        css`
            .inner {
                box-shadow: none;
                border-radius: 0;
                ${mixins.fullbleed()};
                max-width: none;
            }

            :host([open]) .scrim {
                opacity: 1;
            }

            pl-rich-input {
                border: none;
                padding-top: var(--inset-top) !important;
            }
        `,
    ];

    async show(value: string) {
        const promise = super.show();
        await this.updateComplete;
        this._input.value = value;
        setTimeout(() => this._input.focus(), 100);
        return promise;
    }

    done(val?: string) {
        return super.done(val || this._input.value);
    }

    renderContent() {
        return html`
            <pl-rich-input
                class="fullbleed"
                isFullscreen
                @toggle-fullscreen=${() => this.done(this._input.value)}
            ></pl-rich-input>
        `;
    }
}
