import { until } from "lit-html/directives/until.js";
import { AccountInfo } from "@padloc/core/lib/account.js";
import { Field } from "@padloc/core/lib/vault.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { formatDateFromNow } from "../util.js";
import { shared, mixins } from "../styles";
import { confirm, dialog } from "../dialog.js";
import { animateCascade } from "../animation.js";
import { app, router } from "../init.js";
import { setClipboard } from "../clipboard.js";
import { BaseElement, element, html, property, query, queryAll, listen, observe } from "./base.js";
import "./icon.js";
import { Input } from "./input.js";
import { TagsInput } from "./tags-input.js";
import { MoveItemsDialog } from "./move-items-dialog.js";
import { FieldElement } from "./field.js";
import "./field.js";

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
    @queryAll("pl-field")
    _fields: FieldElement[];

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

            .add-button {
                height: 45px;
                line-height: 45px;
            }

            .add-button pl-icon {
                top: -1px;
                font-size: 90%;
            }

            .name {
                height: auto;
                font-size: 150%;
                padding: 6px 10px;
                box-sizing: border-box;
            }

            pl-tags-input {
                margin: 0 10px;
            }

            :host(:not([editing])) pl-field:hover {
                background: #eee;
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

        <header class="narrow back-header tap" @click=${() => router.go("items")}>

            <pl-icon icon="backward"></pl-icon>

            <div>
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
                        <pl-field
                            .name=${field.name}
                            .value=${field.value}
                            .type=${field.type}
                            .editing=${this._editing}
                            @edit=${() => this._editField(index)}
                            @copy=${() => setClipboard(this.item!, field)}
                            @remove=${() => this._removeField(index)}>
                        </pl-field>
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

        </main>

        <div class="fabs" ?hidden=${!this._editing}>

            <pl-icon icon="delete"
                class="fab tap destructive"
                @click=${() => this._deleteItem()}>
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
            fields: [...this._fields].map((fieldEl: FieldElement) => {
                return {
                    name: fieldEl.name,
                    value: fieldEl.value,
                    type: fieldEl.type
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

    private async _addField(field: Field = { name: "", value: "", type: "note" }) {
        this.item!.fields.push(field);
        this.requestUpdate();
        await this.updateComplete;
        setTimeout(() => this._fields[this._fields.length - 1].focus(), 100);
    }

    _activated() {
        setTimeout(() => {
            animateCascade(this.$$(".animate"), { fullDuration: 800, fill: "both" });
        }, 100);
    }

    async _move() {
        const movedItems = await this._moveItemsDialog.show([{ item: this.item!, vault: this.vault! }]);
        if (movedItems && movedItems.length) {
            router.go(`items/${movedItems[0].id}`);
        }
    }

    async _editField(index: number) {
        this._editing = true;
        await this.updateComplete;
        this._fields[index].focus();
    }
}
