import { translate as $l } from "@padloc/locale/src/translate";
import { FIELD_DEFS } from "@padloc/core/src/item";
import { confirm } from "../lib/dialog";
import { Dialog } from "./dialog";
import { html, css } from "lit";
import { customElement } from "lit/decorators.js";
import { formatDateTime } from "../lib/util";
import { VaultItem } from "@padloc/core/src/item";
import { Vault } from "@padloc/core/src/vault";
import { app } from "../globals";

@customElement("pl-history-entry-dialog")
export class HistoryEntryDialog extends Dialog<{ item: VaultItem; vault: Vault; historyIndex: number }, boolean> {
    private _item: VaultItem;

    private _vault: Vault;

    private _historyIndex: number;

    private get _historyEntry() {
        return this._item.history[this._historyIndex];
    }

    static styles = [
        ...Dialog.styles,
        css`
            :host {
                --pl-dialog-max-width: 30em;
            }

            .fields .list-item {
                padding: 0.8em 1.3em;
            }

            .field-value {
                margin-left: 1em;
            }
        `,
    ];

    renderContent() {
        if (!this._historyEntry) {
            return html``;
        }

        const { updated, updatedBy, name } = this._historyEntry;

        const org = this._vault.org && app.getOrg(this._vault.org.id);
        const updatedByMember = updatedBy && org && org.getMember({ accountId: updatedBy });

        return html`
            <div class="padded vertical layout fit-vertically">
                <div class="vertically-margined horizontally-double-margined vertical layout">
                    <h1 class="big stretch">${$l("History Entry")}</h1>

                    <div class="small subtle top-margined">
                        <span class="semibold">
                            <pl-icon icon="edit" class="inline"></pl-icon> ${formatDateTime(updated)}
                        </span>
                        ${$l(
                            "by {0}",
                            updatedByMember
                                ? updatedByMember.name
                                    ? `${updatedByMember.name} <${updatedByMember.email}>`
                                    : updatedByMember.email
                                : $l("You")
                        )}
                    </div>
                </div>

                <pl-scroller class="stretch">
                    <div class="top-padded spacing vertical layout">
                        <div class="horizontal layout border-bottom center-aligning">
                            <h2 class="subtle horizontally-double-margined bottom-margined animated section-header">
                                <pl-icon icon="text" class="inline small light"></pl-icon>
                                ${$l("Name")}
                            </h2>
                            <div class="bottom-margined">
                                ${name !== this._item.name
                                    ? html`<s class="strikethrough">${this._item.name || $l("<Unnamed>")}</s> ${name}`
                                    : name || $l("<Unnamed>")}
                            </div>
                        </div>

                        ${this._renderTags()} ${this._renderFields()}
                    </div>
                </pl-scroller>

                <div class="horizontal evenly stretching spacing layout top-margined">
                    <pl-button class="primary" @click=${() => this._restore()}> ${$l("Restore")} </pl-button>
                    <pl-button @click=${this.dismiss}> ${$l("Cancel")} </pl-button>
                </div>
            </div>
        `;
    }

    async show({ item, vault, historyIndex }: { item: VaultItem; vault: Vault; historyIndex: number }) {
        this._item = item;
        this._vault = vault;
        this._historyIndex = historyIndex;

        return super.show();
    }

    private _renderTags() {
        const added = this._item.tags.filter((tag) => !this._historyEntry.tags.includes(tag));
        const removed = this._historyEntry.tags.filter((tag) => !this._item.tags.includes(tag));
        const unchanged = this._historyEntry.tags.filter((tag) => this._item.tags.includes(tag));

        return html`
            <div class="horizontal layout border-bottom center-aligning">
                <h2 class="subtle horizontally-double-margined bottom-margined animated section-header">
                    <pl-icon icon="tags" class="inline small light"></pl-icon>
                    ${$l("Tags")}
                </h2>
                <div class="bottom-margined tiny wrapping spacing horizontal layout">
                    ${!added.length && !removed.length && !unchanged.length
                        ? $l("<None>")
                        : html`
                              ${unchanged.map(
                                  (tag) =>
                                      html` <div class="tag"><pl-icon icon="tag" class="inline"></pl-icon> ${tag}</div>`
                              )}
                              ${added.map(
                                  (tag) =>
                                      html`
                                          <div class="tag">
                                              <s><pl-icon icon="tag" class="inline"></pl-icon> ${tag}</s>
                                          </div>
                                      `
                              )}
                              ${removed.map(
                                  (tag) =>
                                      html` <div class="tag highlighted">
                                          <pl-icon icon="tag" class="inline"></pl-icon> ${tag}
                                      </div>`
                              )}
                          `}
                </div>
            </div>
        `;
    }

    private _renderFields() {
        return html`
            <div class="fields">
                <h2 class="subtle horizontally-double-margined bottom-margined animated section-header">
                    <pl-icon icon="field" class="inline small light"></pl-icon>
                    ${$l("Fields")}
                </h2>
                <pl-list class="border-top block">
                    ${this._item.fields.map((field, index) => {
                        const historyField = this._historyEntry.fields[index];
                        const fieldDef = FIELD_DEFS[field.type] || FIELD_DEFS.text;
                        const historyFieldDef = (historyField && FIELD_DEFS[historyField.type]) || FIELD_DEFS.text;
                        return html`
                            <div class="list-item">
                                <div class="highlighted small bottom-margined">
                                    ${!historyField || field.name !== historyField.name
                                        ? html`
                                              <s class="right-padded">
                                                  <pl-icon icon=${fieldDef.icon} class="inline"></pl-icon>
                                                  ${field.name}
                                              </s>
                                          `
                                        : ""}
                                    ${historyField
                                        ? html`
                                              <span>
                                                  <pl-icon icon=${historyFieldDef.icon} class="inline"></pl-icon>
                                                  ${historyField.name}
                                              </span>
                                          `
                                        : ""}
                                </div>
                                <div class="field-value">
                                    ${!historyField || field.value !== historyField.value
                                        ? html` <s class="right-padded"> ${field.value} </s> `
                                        : ""}
                                    ${historyField ? html` <span> ${historyField.value} </span> ` : ""}
                                </div>
                            </div>
                        `;
                    })}
                    ${this._historyEntry.fields.slice(this._item.fields.length).map((historyField) => {
                        const historyFieldDef = FIELD_DEFS[historyField.type];
                        return html`
                            <div class="bold list-item">
                                <div class="highlighted small bottom-margined">
                                    <span>
                                        <pl-icon icon=${historyFieldDef.icon} class="inline"></pl-icon>
                                        ${historyField.name} (${$l("restore")})
                                    </span>
                                </div>
                                <div class="field-value">
                                    ${historyField.value
                                        ? html`<span>${historyField.value}</span> `
                                        : html`<span class="subtle">[${$l("empty")}]</span>`}
                                </div>
                            </div>
                        `;
                    })}
                </pl-list>
            </div>
        `;
    }

    private async _restore() {
        this.open = false;
        if (
            await confirm(
                $l("Are you sure you want to restore your item to this version?"),
                $l("Restore"),
                $l("Cancel"),
                { title: $l("Restore Version"), icon: "history" }
            )
        ) {
            this.done(true);
        } else {
            this.open = true;
        }
    }
}
