import { until } from "lit-html/directives/until.js";
import { AccountInfo } from "@padloc/core/lib/account.js";
import { Field } from "@padloc/core/lib/vault.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { formatDateFromNow } from "../util.js";
import { shared, mixins } from "../styles";
import { confirm, generate, dialog } from "../dialog.js";
import { animateCascade } from "../animation.js";
import { app, router } from "../init.js";
import { setClipboard } from "../clipboard.js";
import { BaseElement, element, html, property, query, queryAll, listen, observe } from "./base.js";
import "./icon.js";
import { Input } from "./input.js";
import { TagsInput } from "./tags-input.js";
import { MoveItemsDialog } from "./move-items-dialog.js";

@element("pl-item-view")
export class ItemView extends BaseElement {
    @property()
    selected: string = "";

    get item() {
        const found = (this.selected && app.getItem(this.selected)) || null;
        return found && found.item;
    }

    get vault() {
        const found = (this.selected && app.getItem(this.selected)) || null;
        return found && found.vault;
    }

    @property({ reflect: true, attribute: "editing" })
    private _editing: Boolean = false;

    @query("#nameInput")
    _nameInput: Input;
    @query("pl-tags-input")
    _tagsInput: TagsInput;
    @queryAll("pl-input.field-name")
    _fieldNameInputs: Input[];
    @queryAll("pl-input.field-value")
    _fieldValueInputs: Input[];

    @dialog("pl-move-items-dialog")
    _moveItemsDialog: MoveItemsDialog;

    @listen("item-changed", app)
    @listen("vault-changed", app)
    @listen("lock", app)
    @listen("unlock", app)
    _refresh() {
        this.requestUpdate();
    }

    @observe("selected")
    _selectedChanged() {
        this._editing = false;
    }

    shouldUpdate() {
        return app.locked || (!!this.item && !!this.vault);
    }

    render() {
        if (app.locked || !this.item || !this.vault) {
            return html``;
        }

        const { name, fields, tags, updated, updatedBy } = this.item!;
        const vault = this.vault!;
        const permissions = vault.getPermissions();
        const updatedByMember = vault.getMember({ id: updatedBy } as AccountInfo);

        return html`
        ${shared}

        <style>

            :host {
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                flex-direction: column;
                position: relative;
                background: var(--color-background);
                ${mixins.scroll()}
            }

            main {
                flex: 1;
                flex-direction: column;
                padding: 10px;
                padding-bottom: 65px;
            }

            pl-input {
                height: auto;
                line-height: 30px;
                box-sizing: border-box;
            }

            pl-input:not([readonly]), .add-button {
                background: #fafafa;
                border: solid 1px #eee;
                border-radius: 8px;
            }

            .add-button {
                height: 45px;
                line-height: 45px;
            }

            .add-button pl-icon {
                top: -1px;
                font-size: 90%;
            }

            .name {
                font-size: 150%;
                padding: 6px 10px;
            }

            pl-tags-input {
                margin: 0 10px;
            }

            .field {
                transform: translate3d(0, 0, 0);
                display: flex;
                align-items: center;
                border-radius: 8px;
            }

            :host(:not([editing])) .field:hover {
                background: #eee;
            }

            .field-buttons {
                display: flex;
                flex-direction: column;
                justify-content: center;
            }

            .field:not(:hover) .field-buttons.right {
                visibility: hidden;
            }

            .field-name {
                font-size: var(--font-size-tiny);
                font-weight: bold;
                color: var(--color-highlight);
                padding: 0 10px;
            }

            .field-name:not([readonly]) {
                margin-bottom: 4px;
            }

            .field-value {
                font-family: var(--font-family-mono);
                font-size: 110%;
                flex: 1;
                padding: 0 10px;
                opacity: 1;
                --rule-width: 1px;
            }

            button {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-top: 10px;
            }

            button pl-icon {
                width: 30px;
                position: relative;
                top: 1px;
            }

            .updated {
                text-align: center;
                font-size: var(--font-size-tiny);
                color: #888;
                background: rgba(255, 255, 255, 0.5);
                position: absolute;
                left: 10px;
                bottom: 10px;
            }

            .updated::before {
                font-family: FontAwesome;
                font-size: 80%;
                content: "\\f303\ ";
            }
        </style>

        <header class="narrow back-header">

            <pl-icon icon="backward" @click=${() => router.go("items")}></pl-icon>

            <div @click=${() => router.go("items")}>
                ${(app.filter.vault && app.filter.vault.name) || $l("All Items")}
            </div>

        </header>

        <main>

            <pl-input
                id="nameInput"
                class="name"
                .value=${name}
                .placeholder=${$l("Enter Item Name")}
                ?readonly=${!this._editing}>
            </pl-input>

            <pl-tags-input
                .editing=${this._editing}
                .vault=${vault}
                .tags=${tags}>
            </pl-tags-input>

            <div class="fields">

                ${fields.map(
                    (field: Field, index: number) => html`

                    <div class="field">

                        <div class="field-buttons" ?hidden=${!this._editing}>

                            <pl-icon
                                icon="remove"
                                class="tap"
                                @click=${() => this._removeField(index)}>
                            </pl-icon>

                            <pl-icon
                                icon="generate"
                                class="tap"
                                @click=${() => this._generateValue(index)}>
                            </pl-icon>

                        </div>

                        <div class="flex">

                            <pl-input class="field-name"
                                placeholder="${$l("Field Name")}"
                                .value=${field.name}
                                ?readonly=${!this._editing}>
                            </pl-input>

                            <pl-input
                                class="field-value"
                                placeholder="${$l("Field Content")}"
                                .value=${field.value}
                                .masked=${field.masked && !this._editing}
                                multiline
                                autosize
                                ?readonly=${!this._editing}>
                            </pl-input>

                        </div>

                        <div class="field-buttons right" ?hidden=${this._editing}>

                            <pl-icon
                                icon="copy"
                                class="tap"
                                @click=${() => setClipboard(this.item!, field)}>
                            </pl-icon>

                            <pl-icon
                                icon="hide"
                                class="tap"
                                @click=${() => this._toggleMask(index)}>
                            </pl-icon>

                        </div>

                    </div>

                `
                )}
            </div>

            <button class="add-button tap" @click=${() => this._addField()} ?hidden=${!this._editing}>

                <pl-icon icon="add"></pl-icon>

                <div>${$l("Add Field")}</div>

            </button>

            <div class="updated" hidden>
                ${until(formatDateFromNow(updated))}
                ${updatedByMember && " " + $l("by {0}", updatedByMember.email)}
            </div>

            <div class="fabs" ?hidden=${!this._editing}>

                <pl-icon icon="delete"
                    class="fab tap destructive"
                    @click=${() => this._deleteItem()}
                    ?hidden=${!this._editing}>
                </pl-icon>

                <div class="flex"></div>

                <pl-icon icon="check"
                    class="tap fab"
                    @click=${() => this.save()}>
                </pl-icon>

            </div>

            <div class="fabs" ?hidden=${this._editing || !permissions.write}>

                <pl-icon icon="share"
                    class="tap fab"
                    @click=${() => this._move()}>
                </pl-icon>

                <div class="flex"></div>

                <pl-icon icon="edit"
                    class="tap fab"
                    @click=${() => this.edit()}>
                </pl-icon>

            </div>

        </main>
`;
    }

    async edit() {
        this._editing = true;
        await this.updateComplete;
        this._nameInput.focus();
    }

    save() {
        app.updateItem(this.vault!, this.item!, {
            name: this._nameInput.value,
            fields: [...this._fieldNameInputs].map((inp: Input, i: number) => {
                return {
                    ...this.item!.fields[i],
                    name: inp.value,
                    value: this._fieldValueInputs[i].value
                };
            }),
            tags: this._tagsInput.tags
        });
        this._editing = false;
    }

    private _removeField(index: number) {
        const item = this.item!;
        item.fields = item.fields.filter((_, i) => i !== index);
        this.requestUpdate();
    }

    private async _deleteItem() {
        const confirmed = await confirm($l("Are you sure you want to delete this item?"), $l("Delete"), $l("Cancel"), {
            type: "warning",
            icon: "question"
        });
        if (confirmed) {
            app.deleteItems([{ vault: this.vault!, item: this.item! }]);
            router.go("items");
        }
    }

    private async _addField(field = { name: "", value: "", masked: false }) {
        this.item!.fields.push(field);
        this.requestUpdate();
        await this.updateComplete;
        setTimeout(() => this._fieldNameInputs[this._fieldNameInputs.length - 1].focus(), 100);
    }

    _activated() {
        setTimeout(() => {
            animateCascade(this.$$(".animate"), { fullDuration: 800, fill: "both" });
        }, 100);
    }

    private async _generateValue(index: number) {
        const value = await generate();
        if (value) {
            this._fieldValueInputs[index].value = value;
        }
    }

    _toggleMask(index: number) {
        const item = this.item!;
        item.fields[index].masked = !item.fields[index].masked;
        app.updateItem(this.vault!, item, {
            fields: item.fields
        });
    }

    async _move() {
        const movedItems = await this._moveItemsDialog.show([{ item: this.item!, vault: this.vault! }]);
        if (movedItems && movedItems.length) {
            router.go(`items/${movedItems[0].id}`);
        }
    }
}
