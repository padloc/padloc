import { AccountInfo } from "@padlock/core/lib/account.js";
import { Field } from "@padlock/core/lib/vault.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { formatDateFromNow } from "../util.js";
import { shared, mixins } from "../styles";
import { confirm, generate } from "../dialog.js";
import { animateCascade } from "../animation.js";
import { app, router } from "../init.js";
import { BaseElement, element, html, property, query, queryAll, listen } from "./base.js";
import "./icon.js";
import { Input } from "./input.js";
import { TagsInput } from "./tags-input.js";

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

    @listen("lock", app)
    _locked() {
        this.selected = "";
    }

    @listen("item-changed", app)
    @listen("vault-changed", app)
    _refresh() {
        this.requestUpdate();
    }

    shouldUpdate() {
        return !!this.item && !!this.vault;
    }

    render() {
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
                padding: 15px;
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

            .delete-button {
                ${mixins.gradientWarning(true)}
                color: var(--color-tertiary);
                border-radius: 8px;
            }

            .updated {
                margin-top: 50px;
                padding: 10px;
                text-align: center;
                font-size: var(--font-size-tiny);
                color: #888;
            }

            .updated::before {
                font-family: FontAwesome;
                font-size: 80%;
                content: "\\f303\ ";
            }
        </style>

        <header class="narrow back-header">

            <pl-icon icon="backward" class="tap" @click=${() => router.go("items")}></pl-icon>
            
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
                                multiline
                                autosize
                                ?readonly=${!this._editing}>
                            </pl-input>

                        </div>

                        <div class="field-buttons right" ?hidden=${this._editing}>

                            <pl-icon
                                icon="copy"
                                class="tap"
                                @click=${() => this._copyField(index)}>
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

            <button class="delete-button tap" @click=${() => this._deleteItem()} ?hidden=${!this._editing}>

                <pl-icon icon="delete"></pl-icon>

                <div>${$l("Delete Item")}</div>

            </button>

            <div class="updated animate">
                ${formatDateFromNow(updated)}
                ${updatedByMember && " " + $l("by {0}", updatedByMember.email)}
            </div>

            <pl-icon icon="edit"
                class="tap fab"
                @click=${() => this.edit()}
                ?hidden=${this._editing}
                ?disabled=${!permissions.write}>
            </pl-icon>

            <pl-icon icon="check" class="tap fab" @click=${() => this.save()} ?hidden=${!this._editing}></pl-icon>

        </main>
`;
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
            app.deleteItems(this.vault!, [this.item!]);
            router.go("items");
        }
    }

    private async _addField(field = { name: "", value: "", masked: false }) {
        this.item!.fields.push(field);
        this.requestUpdate();
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

    async edit() {
        this._editing = true;
        await this.updateComplete;
        this._nameInput.focus();
    }

    save() {
        app.updateItem(this.vault!, this.item!, {
            name: this._nameInput.value,
            fields: [...this._fieldNameInputs].map((inp: Input, i: number) => {
                return { name: inp.value, value: this._fieldValueInputs[i].value };
            }),
            tags: this._tagsInput.tags
        });
        this._editing = false;
    }
}
