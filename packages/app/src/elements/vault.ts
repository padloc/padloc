import { Vault } from "@padloc/core/lib/vault.js";
import { VaultItem, Field } from "@padloc/core/lib/item.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { repeat } from "lit-html/directives/repeat.js";
import { cache } from "lit-html/directives/cache.js";
import { setClipboard } from "../clipboard.js";
import { app, router } from "../init.js";
import { shared, mixins } from "../styles";
import { BaseElement, element, html, property, listen } from "./base.js";
// import { CreateItemDialog } from "./create-item-dialog.js";
// import { MoveItemsDialog } from "./move-items-dialog.js";
import "./icon.js";
import "./browse-filter.js";

@element("pl-vault")
export class Vaults extends BaseElement {
    @property()
    vault: Vault;

    @property()
    selected: string = "";
    @property()
    multiSelect: boolean = false;
    //
    // @dialog("pl-create-item-dialog")
    // private _createItemDialog: CreateItemDialog;
    //
    // @dialog("pl-move-items-dialog")
    // private _moveItemsDialog: MoveItemsDialog;

    @property()
    private _items: VaultItem[] = [];

    private _multiSelect = new Map<string, VaultItem>();

    private _sections = new Map<number, string>();

    @listen("items-added", app)
    @listen("items-deleted", app)
    @listen("item-changed", app)
    @listen("items-moved", app)
    @listen("settings-changed", app)
    @listen("vault-changed", app)
    @listen("filter-changed", app)
    @listen("unlock", app)
    @listen("lock", app)
    @listen("synchronize", app)
    _updateItems() {
        let items = [...this.vault.items];
        this._sections.clear();

        const recentCount = 0;

        const recent = items
            .sort((a, b) => {
                return (b.lastUsed || b.updated).getTime() - (a.lastUsed || a.updated).getTime();
            })
            .slice(0, recentCount);

        items = items.slice(recentCount);

        items = recent.concat(
            items.sort((a, b) => {
                const x = a.name.toLowerCase();
                const y = b.name.toLowerCase();
                return x > y ? 1 : x < y ? -1 : 0;
            })
        );

        for (let i = 0, item, prevSection; i < items.length; i++) {
            item = items[i];

            const section =
                i < recentCount
                    ? $l("Recently Used")
                    : (item && item.name[0] && item.name[0].toUpperCase()) || $l("No Name");

            const firstInSection = section !== prevSection;
            if (firstInSection) {
                this._sections.set(i, section);
            }

            prevSection = section;
        }

        this._items = items;
    }

    selectItem(item: VaultItem) {
        if (this.multiSelect) {
            if (this._multiSelect.has(item.id)) {
                this._multiSelect.delete(item.id);
            } else {
                this._multiSelect.set(item.id, item);
            }
            this.requestUpdate();
        } else {
            router.go(`item/${item.id}`);
        }
    }

    selectAll() {
        this.multiSelect = true;
        for (const item of this.vault.items) {
            this._multiSelect.set(item.id, item);
        }
        this.requestUpdate();
    }

    clearSelection() {
        this._multiSelect.clear();
        this.requestUpdate();
    }

    cancelMultiSelect() {
        this._multiSelect.clear();
        this.multiSelect = false;
        this.requestUpdate();
    }
    //
    // private async _newItem() {
    //     await this._createItemDialog.show();
    // }
    //
    // private async _deleteItems() {
    //     const confirmed = await confirm(
    //         $l("Are you sure you want to delete these items? This action can not be undone!"),
    //         $l("Delete {0} Items", this._multiSelect.size.toString()),
    //         $l("Cancel"),
    //         { type: "warning" }
    //     );
    //     if (confirmed) {
    //         await app.deleteItems([...this._multiSelect.values()]);
    //         this.cancelMultiSelect();
    //     }
    // }
    //
    // private async _moveItems() {
    //     const movedItems = await this._moveItemsDialog.show([...this._multiSelect.values()]);
    //     if (movedItems) {
    //         this.cancelMultiSelect();
    //     }
    // }

    private _copyField(item: VaultItem, index: number, e: Event) {
        e.stopPropagation();
        setClipboard(item, item.fields[index]);
        const fieldEl = e.target as HTMLElement;
        fieldEl.classList.add("copied");
        setTimeout(() => fieldEl.classList.remove("copied"), 1000);
    }

    private _renderItem(index: number) {
        const item = this._items[index];
        const section = this._sections.get(index);
        const tags = [];

        // if (item.warning) {
        //     tags.push({ icon: "error", class: "tag warning", name: "" });
        // }

        const t = item.tags[0];
        if (t) {
            tags.push({
                name: item.tags.length > 1 ? `${t} (+${item.tags.length - 1})` : t,
                icon: "",
                class: ""
            });
        }

        const attCount = (item.attachments && item.attachments.length) || 0;
        if (attCount) {
            tags.push({
                name: "",
                icon: "attachment",
                class: ""
            });
        }

        return html`
            ${cache(
                section
                    ? html`
                          <div class="section-header">
                              <div>${section}</div>

                              <div class="spacer"></div>

                              <div>${section}</div>
                          </div>
                      `
                    : html``
            )}

            <div
                class="item tap"
                ?selected=${item.id === this.selected}
                @click=${() => this.selectItem(item)}
                index="${index}"
            >
                <div class="item-check" ?hidden=${!this.multiSelect} ?checked=${this._multiSelect.has(item.id)}></div>

                <div class="item-body">
                    <div class="item-header">
                        <div class="item-name" ?disabled=${!item.name}>
                            ${item.name || $l("No Name")}
                        </div>

                        <div class="tags small">
                            ${tags.map(tag =>
                                tag.icon
                                    ? html`
                                          <div class="tag ${tag.class}">
                                              <pl-icon icon="${tag.icon}"></pl-icon>
                                          </div>
                                      `
                                    : html`
                                          <div class="ellipsis tag ${tag.class}">${tag.name}</div>
                                      `
                            )}
                        </div>
                    </div>

                    <div class="item-fields">
                        ${item.fields.map(
                            (f: Field, i: number) => html`
                                <div class="item-field tap" @click=${(e: MouseEvent) => this._copyField(item, i, e)}>
                                    <div class="item-field-label">${f.name}</div>

                                    <div class="copied-message">${$l("copied")}</div>
                                </div>
                            `
                        )}

                        <div class="item-field" disabled ?hidden=${!!item.fields.length}>
                            ${$l("No Fields")}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    shouldUpdate() {
        return !!this.vault;
    }

    render() {
        return html`
            ${shared}

            <style>

                :host {
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                    position: relative;
                }

                h1 {
                    color: var(--color-tertiary);
                    text-shadow: rgba(0, 0, 0, 0.2) 0 2px 0;
                    font-weight: 400;
                }

                main {
                    padding-bottom: 70px;
                    background: var(--color-quaternary);
                    border-radius: var(--border-radius);
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    grid-gap: 6px;
                }

                .section-header {
                    background: inherit;
                    position: sticky;
                    top: 0;
                    z-index: 1;
                    display: flex;
                    height: 30px;
                    line-height: 30px;
                    padding: 0 15px;
                    font-size: var(--font-size-tiny);
                    font-weight: bold;
                    box-sizing: border-box;
                    border-radius: var(--border-radius);
                    margin-bottom: -6px;
                    margin-top: 8px;
                    font-weight: 800;
                }

                .item {
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    margin: 0;
                    /* background: var(--color-tertiary); */
                    /* margin: 10px; */
                    /* box-shadow: rgba(0, 0, 0, 0.3) 0px 1px 3px; */
                    /* border-radius: var(--border-radius); */
                }

                .item-body {
                    flex: 1;
                    min-width: 0;
                }

                .item .tags {
                    padding: 0 8px;
                }

                .item-header {
                    height: var(--row-height);
                    line-height: var(--row-height);
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .item-name {
                    padding-left: 15px;
                    ${mixins.ellipsis()}
                    font-weight: bold;
                    flex: 1;
                    min-width: 0;
                }

                .item-fields {
                    position: relative;
                    display: flex;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }

                .item-fields::after {
                    content: "";
                    display: block;
                    width: 6px;
                    flex: none;
                }

                .item-field {
                    cursor: pointer;
                    font-size: var(--font-size-tiny);
                    line-height: 32px;
                    height: 32px;
                    text-align: center;
                    position: relative;
                    flex: 1;
                    font-weight: bold;
                    margin: 0 0 8px 8px;
                    border-radius: 8px;
                    ${mixins.shade2()}
                }

                .item-field > * {
                    transition: transform 0.2s cubic-bezier(1, -0.3, 0, 1.3), opacity 0.2s;
                }

                .copied-message {
                    ${mixins.fullbleed()}
                    border-radius: inherit;
                }

                .item-field:not(.copied) .copied-message, .item-field.copied .item-field-label {
                    opacity: 0;
                    transform: scale(0);
                }

                .copied-message {
                    font-weight: bold;
                    background: var(--color-primary);
                    color: var(--color-background);
                }

                .copied-message::before {
                    font-family: "FontAwesome";
                    content: "\\f00c\\ ";
                }

                .item-field-label {
                    padding: 0 15px;
                    pointer-events: none;
                    ${mixins.ellipsis()}
                }

                .item:focus:not([selected]) {
                    border-color: var(--color-highlight);
                    color: #4ca8d9;
                }

                .item[selected] {
                    background: #e6e6e6;
                    border-color: #ddd;
                }

                .item-check {
                    position: relative;
                    width: 30px;
                    height: 30px;
                    box-sizing: border-box;
                    border: solid 3px #eee;
                    background: #eee;
                    border-radius: 30px;
                    margin: 10px;
                    margin-right: 5px;
                }

                .item-check::after {
                    content: "";
                    display: block;
                    ${mixins.fullbleed()}
                    background: var(--color-primary);
                    border-radius: inherit;
                    transition: transform 0.2s, opacity 0.2s;
                    transition-timing-function: cubic-bezier(1, -0.3, 0, 1.3);
                }

                .item-check:not([checked])::after {
                    opacity: 0;
                    transform: scale(0);
                }

                .selected-count {
                    text-align: center;
                    display: block;
                    margin-left: 15px;
                    background: #ddd;
                    border-radius: var(--border-radius);
                    padding: 5px;
                    line-height: 1.2em;
                    font-size: var(--font-size-tiny);
                    font-weight: bold;
                }
            </style>

            <h1>${this.vault.name}</h1>

            <main id="main">
                ${repeat(this._items, item => item.id, (_: any, index: number) => this._renderItem(index))}
            </main>

            <div class="empty-placeholder" ?hidden=${!!this.vault.items.size || app.filter.text}>
                <pl-icon icon="list"></pl-icon>

                <div>${$l("This vault doesn't have any items yet!")}</div>
            </div>
        `;
    }
}
