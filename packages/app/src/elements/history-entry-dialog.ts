import { translate as $l } from "@padloc/locale/src/translate";
import { ItemHistory, Field } from "@padloc/core/src/item";
import { confirm } from "../lib/dialog";
import { Dialog } from "./dialog";
import { html, css } from "lit";
import { customElement } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

@customElement("pl-history-entry-dialog")
export class HistoryEntryDialog extends Dialog<ItemHistory, boolean> {
    private _historyEntry: ItemHistory;

    static styles = [
        ...Dialog.styles,
        css`
            :host {
                --pl-dialog-max-width: 40em;
            }
        `,
    ];

    // TODO: show vault changes

    renderContent() {
        if (!this._historyEntry) {
            return html``;
        }

        const { fieldsChanged, date } = this._historyEntry;

        return html`
            <div class="padded vertical spacing layout">
                <h1 class="big margined text-centering">${$l("History Entry")}</h1>
                <h2 class="margined text-centering">${$l("Created at {0}", date as unknown as string)}</h2>

                <div class="stretch"></div>

                ${fieldsChanged.includes("name") ? this._showChangedNameContent() : null}
                ${fieldsChanged.includes("tags") ? this._showChangedTagsContent() : null}
                ${fieldsChanged.includes("fields") ? this._showChangedFieldsContent() : null}

                <div class="horizontal evenly stretching spacing layout top-margined">
                    <pl-button class="primary" @click=${() => this._restore()}>
                        ${$l("Restore item to this version")}
                    </pl-button>
                    <pl-button @click=${this.dismiss}> ${$l("Cancel")} </pl-button>
                </div>
            </div>
        `;
    }

    async show(historyEntry: ItemHistory) {
        await this.updateComplete;
        this._historyEntry = historyEntry;
        return super.show();
    }

    private _showChangedNameContent() {
        return html`
            <div class="tags border-bottom">
                <h2 class="subtle horizontally-double-margined bottom-margined animated section-header">
                    <pl-icon icon="text" class="inline small light"></pl-icon>
                    ${$l("Name")}
                </h2>
                <div class="bottom-margined">${this._historyEntry.name || $l("<None>")}</div>
            </div>
        `;
    }

    private _showChangedTagsContent() {
        return html`
            <div class="tags border-bottom">
                <h2 class="subtle horizontally-double-margined bottom-margined animated section-header">
                    <pl-icon icon="tags" class="inline small light"></pl-icon>
                    ${$l("Tags")}
                </h2>
                <div class="bottom-margined tiny wrapping spacing horizontal layout">
                    ${this._historyEntry.tags.length === 0
                        ? $l("<None>")
                        : this._historyEntry.tags.map(
                              (tag) =>
                                  html` <div class="tag"><pl-icon class="inline" icon="tag"></pl-icon>${tag}</div> `
                          )}
                </div>
            </div>
        `;
    }

    private _showChangedFieldsContent() {
        return html`
            <div class="fields border-bottom">
                <h2 class="subtle horizontally-double-margined bottom-margined animated section-header">
                    <pl-icon icon="field" class="inline small light"></pl-icon>
                    ${$l("Fields")}
                </h2>
                <pl-list class="border-top block">
                    ${repeat(
                        this._historyEntry.fields,
                        (field) => `${field.name}_${field.type}`,
                        (field: Field) => html`
                            <pl-field class="padded list-item" .field=${field} .editing=${false} .auditResults=${[]}>
                            </pl-field>
                        `
                    )}
                </pl-list>
            </div>
        `;
    }

    private async _restore() {
        if (
            await confirm(
                $l("Are you sure you want to restore your item to this version?"),
                $l("Yes"),
                $l("No, cancel")
            )
        ) {
            this.done(true);
        }
    }
}
