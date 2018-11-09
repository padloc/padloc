import { AccountInfo } from "@padlock/core/lib/auth.js";
import { VaultItem, Field } from "@padlock/core/lib/data.js";
import { Vault } from "@padlock/core/lib/vault.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { formatDateFromNow } from "../util.js";
import { shared, config, mixins } from "../styles";
import { confirm, prompt, choose, generate } from "../dialog.js";
import { animateCascade } from "../animation.js";
import { app, router } from "../init.js";
import { BaseElement, element, html, property, query, queryAll, listen } from "./base.js";
import "./icon.js";
import { Input } from "./input.js";
import { TagsInput } from "./tags-input.js";

@element("pl-item-view")
export class ItemView extends BaseElement {
    @property()
    item: {
        vault: Vault;
        item: VaultItem;
    } | null = null;
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
        this.item = null;
    }

    @listen("item-changed", app)
    _itemChanged(e: CustomEvent) {
        if (e.detail.item === this.item) {
            this.requestUpdate();
        }
    }

    shouldUpdate() {
        return !!this.item;
    }

    render() {
        const item = this.item!;
        const { name, fields, tags, updated, updatedBy } = item.item;
        const vault = item.vault;
        const permissions = vault.getPermissions();
        // TODO
        // const removedMembers = vault instanceof SharedVault ? vault.getOldAccessors(item!) : [];
        const removedMembers: any[] = [];
        const vaultName = vault.name;
        const updatedByMember = vault.getMember({ id: updatedBy } as AccountInfo);

        return html`
        ${shared}

        <style>

            :host {
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                position: relative;
                background: var(--color-background);
                ${mixins.scroll()}
            }

            header > pl-input {
                flex: 1;
                width: 0;
            }

            main {
                display: flex;
                flex-direction: column;
                padding: 15px;
            }

            pl-input {
                height: auto;
                --line-height: 30px;
                --rule-width: 2px;
                --rule-color: currentColor;
                line-height: var(--line-height);
            }

            .title {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
            }

            .name {
                --line-height: 50px;
                flex: 1;
                font-size: 140%;
                padding: 0 10px;
            }

            .tags {
                padding: 0 8px;
            }

            .field {
                transform: translate3d(0, 0, 0);
                margin: 10px 0;
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

            .add-button {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .add-button pl-icon {
                width: 30px;
                position: relative;
                top: 1px;
            }

            .updated {
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

            pl-input {
                line-height: var(--line-height);
                box-sizing: border-box;
            }

            pl-input:not([readonly]) {
                background: #fafafa;
                border: solid 1px #eee;
                border-radius: 8px;
                /*
                background-image: linear-gradient(transparent, transparent calc(var(--line-height) - var(--rule-width)), var(--rule-color) calc(var(--line-height) - var(--rule-width)), var(--rule-color) var(--line-height), transparent var(--line-height));
                background-size: 100% var(--line-height);
                */
            }

            @media (min-width: ${config.narrowWidth}px) {
                header {
                    display: none;
                }
            }
        </style>

        <header>

            <pl-icon icon="back" class="tap" @click=${() => router.go("items")}></pl-icon>

        </header>

        <main>

            <div class="title">

                <pl-input
                    id="nameInput"
                    class="name"
                    .value=${name}
                    .placeholder=${$l("Enter Item Name")}
                    ?readonly=${!this._editing}>
                </pl-input>

            </div>

            <pl-tags-input
                .editing=${this._editing}
                .vault=${this.item!.vault}
                .tags=${this.item!.item.tags}>
            </pl-tags-input>

            <section class="highlight" ?hidden=${!removedMembers.length}>

                <div class="info">

                    <pl-icon class="info-icon" icon="error"></pl-icon>

                    <div class="info-body">

                        <div class="info-text">${$l(
                            "{0} users have been removed from the '{1}' vault since this item was last updated. " +
                                "Please update any sensitive information as soon as possible!",
                            removedMembers.length.toString(),
                            vaultName
                        )}</div>

                    </div>

                </div>

                <button class="tap" @click=${() => this._dismissWarning()}>${$l("Dismiss")}</button>

            </section>

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

            <div class="flex"></div>

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
        this.item!.item.fields = this.item!.item.fields.filter((_, i) => i !== index);
        this.requestUpdate();
    }

    private async _deleteItem() {
        const { vault, item } = this.item!;
        const confirmed = await confirm($l("Are you sure you want to delete this item?"), $l("Delete"));
        if (confirmed) {
            app.deleteItems(vault, [item]);
            router.back();
        }
    }

    private async _addField(field = { name: "", value: "", masked: false }) {
        this.item!.item.fields.push(field);
        this.requestUpdate();
    }

    private async _removeTag(tag: string) {
        const { vault, item } = this.item!;
        const confirmed = await confirm($l("Do you want to remove this tag?"), $l("Remove"), $l("Cancel"), {
            title: $l("Remove Tag")
        });
        if (confirmed) {
            app.updateItem(vault, item, { tags: item.tags.filter(t => t !== tag) });
        }
    }

    private async _createTag() {
        const { vault, item } = this.item!;
        const tag = await prompt("", {
            placeholder: $l("Enter Tag Name"),
            confirmLabel: $l("Add Tag"),
            preventDismiss: false,
            cancelLabel: ""
        });
        if (tag && !item.tags.includes(tag)) {
            app.updateItem(vault, item, { tags: item.tags.concat([tag]) });
        }
    }

    private async _addTag() {
        const { vault, item } = this.item!;
        const tags = app.tags.filter((tag: string) => !item.tags.includes(tag));
        if (!tags.length) {
            return this._createTag();
        }

        const choice = await choose("", tags.concat([$l("New Tag")]), { preventDismiss: false });
        if (choice == tags.length) {
            return this._createTag();
        }

        const tag = tags[choice];
        if (tag) {
            app.updateItem(vault, item, { tags: item.tags.concat([tag]) });
        }
    }

    _activated() {
        setTimeout(() => {
            animateCascade(this.$$(".animate"), { fullDuration: 800, fill: "both" });
        }, 100);
    }

    private _dismissWarning() {
        app.updateItem(this.item!.vault, this.item!.item, {});
    }

    private _openVault(vault: Vault) {
        router.go(`vault/${vault.id}`);
    }

    private async _generateValue(index: number) {
        const value = await generate();
        if (value) {
            this._fieldValueInputs[index].value = value;
        }
    }

    edit() {
        this._editing = true;
    }

    save() {
        app.updateItem(this.item!.vault, this.item!.item, {
            name: this._nameInput.value,
            fields: [...this._fieldNameInputs].map((inp: Input, i: number) => {
                return { name: inp.value, value: this._fieldValueInputs[i].value };
            }),
            tags: this._tagsInput.tags
        });
        this._editing = false;
    }
}
