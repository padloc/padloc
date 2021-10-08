import { Generator } from "./generator";
import { html } from "lit";
import { $l } from "@padloc/locale/src/translate";
import { Dialog } from "./dialog";
import { customElement, query } from "lit/decorators.js";
import "./scroller";

@customElement("pl-generator-dialog")
export class GeneratorDialog extends Dialog<void, string> {
    @query("pl-generator")
    private _generator: Generator;

    renderContent() {
        return html`
            <div class="padded header">
                <div class="huge text-centering top-margined">${$l("Generate Password")}</div>
            </div>

            <pl-scroller class="stretch">
                <pl-generator></pl-generator>
            </pl-scroller>

            <footer class="padded horizontal evenly stretching spacing layout">
                <pl-button class="primary" @click=${() => this._confirm()}>${$l("Use")}</pl-button>
                <pl-button @click=${() => this.dismiss()}>${$l("Discard")}</pl-button>
            </footer>
        `;
    }

    async show(): Promise<string> {
        await this.updateComplete;
        this._generator.generate();
        return super.show();
    }

    private _confirm() {
        this.done(this._generator.value);
    }
}
