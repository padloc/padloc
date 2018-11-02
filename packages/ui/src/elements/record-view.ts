import { AccountInfo } from "@padlock/core/lib/auth.js";
import { Record, Field } from "@padlock/core/lib/data.js";
import { Vault } from "@padlock/core/lib/vault.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { formatDateFromNow } from "../util.js";
import { shared, config } from "../styles";
import { confirm, prompt, choose, generate, getDialog } from "../dialog.js";
import { animateCascade } from "../animation.js";
import { app, router } from "../init.js";
import { BaseElement, element, html, property, query, queryAll, listen } from "./base.js";
import "./icon.js";
import { Input } from "./input.js";
import "./record-field.js";
import "./field-dialog.js";
import { ShareDialog } from "./share-dialog.js";
import "./share-dialog.js";

@element("pl-record-view")
export class RecordView extends BaseElement {
    @property()
    vault: Vault | null = null;
    @property()
    record: Record | null = null;
    @property()
    private _editing: Boolean = false;

    @query("#nameInput")
    _nameInput: Input;
    @queryAll("pl-input.field-name")
    _fieldNameInputs: Input[];
    @queryAll("pl-input.field-value")
    _fieldValueInputs: Input[];

    get _shareDialog() {
        return getDialog("pl-share-dialog") as ShareDialog;
    }

    @listen("lock", app)
    _locked() {
        this.record = null;
        const fieldDialog = getDialog("pl-field-dialog");
        fieldDialog.open = false;
        fieldDialog.field = null;
    }

    @listen("record-changed", app)
    _recordChanged(e: CustomEvent) {
        if (e.detail.record === this.record) {
            this.requestUpdate();
        }
    }

    shouldUpdate() {
        return !!this.record;
    }

    render() {
        const record = this.record!;
        const vault = this.vault!;
        const { name, fields, tags, updated, updatedBy } = record;
        const permissions = vault.getPermissions();
        // TODO
        // const removedMembers = vault instanceof SharedVault ? vault.getOldAccessors(record!) : [];
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
                transition: background 0.5s;
                background: var(--color-tertiary);
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
                padding: 10px 0;
                display: flex;
                align-items: center;
            }

            .field-buttons {
                display: flex;
                flex-direction: column;
                justify-content: center;
            }

            .field-name {
                font-size: var(--font-size-tiny);
                font-weight: bold;
                color: var(--color-highlight);
                padding: 0 10px;
            }

            .field-value {
                font-family: var(--font-family-mono);
                font-size: 110%;
                flex: 1;
                padding: 0 10px;
                opacity: 1;
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
            }

            pl-input:not([readonly]) {
                background-image: linear-gradient(white, white calc(var(--line-height) - 1px), rgb(204, 204, 204) calc(var(--line-height) - 1px), rgb(204, 204, 204) var(--line-height), white var(--line-height));
                background-size: 100% var(--line-height);
            }

            @media (min-width: ${config.narrowWidth}px) {
                header {
                    display: none;
                }
            }
        </style>

        <header>
            <pl-icon icon="list" class="tap" @click=${() => router.go("")}></pl-icon>
        </header>

        <main>

            <div class="title">

                <pl-input id="nameInput" class="name" .value=${name} ?readonly=${!this._editing}></pl-input>

                <button class="tap" @click=${() => this.save()} ?hidden=${!this._editing}>${$l("Done")}</button>

                <pl-icon icon="edit" class="tap" @click=${() => this.edit()} ?hidden=${this._editing}></pl-icon>

            </div>

            <div class="tags small">

                <div class="tag highlight tap" @click=${() => this._openVault(vault!)}>

                    <pl-icon icon="vault"></pl-icon>

                    <div class="tag-name">${vaultName}</div>

                </div>

                <div class="tag warning" ?hidden=${permissions.write}>

                    <pl-icon icon="show"></pl-icon>

                    <div class="tag-name">${$l("read-only")}</div>

                </div>

                ${tags.map(
                    (tag: string) => html`
                    <div class="tag tap" @click=${() => this._removeTag(tag)}>

                        <pl-icon icon="tag"></pl-icon>

                        <div class="tag-name">${tag}</div>

                    </div>
                `
                )}

            </div>

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

                        <div class="field-buttons">

                            <pl-icon
                                icon="remove"
                                class="tap"
                                ?hidden=${!this._editing}
                                @click=${() => this._removeField(index)}>
                            </pl-icon>

                            <pl-icon
                                icon="generate"
                                class="tap"
                                ?hidden=${!this._editing}
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

        </main>
`;
    }

    private _removeField(index: number) {
        this.record!.fields = this.record!.fields.filter((_, i) => i !== index);
        this.requestUpdate();
    }

    private async _changeField(index: number, changes: { name?: string; value?: string; masked?: boolean }) {
        if (!this.vault || !this.record) {
            throw "vault or record member not set";
        }
        const fields = [...this.record.fields];
        fields[index] = Object.assign({}, fields[index], changes);
        app.updateRecord(this.vault, this.record, { fields: fields });
    }

    private async _deleteRecord() {
        if (!this.vault || !this.record) {
            throw "vault or record member not set";
        }
        const confirmed = await confirm($l("Are you sure you want to delete this record?"), $l("Delete"));
        if (confirmed) {
            app.deleteRecords(this.vault, [this.record]);
            router.back();
        }
    }

    private async _addField(field = { name: "", value: "", masked: false }) {
        this.record!.fields.push(field);
        this.requestUpdate();
        // if (!this.vault || !this.record) {
        //     throw "vault or record member not set";
        // }
        // const result = await openField(field, true);
        // switch (result.action) {
        //     case "generate":
        //         const value = await generate();
        //         field.value = value;
        //         field.name = result.name;
        //         this._addField(field);
        //         break;
        //     case "edit":
        //         Object.assign(field, result);
        //         app.updateRecord(this.vault, this.record, { fields: this.record.fields.concat([field]) });
        //         break;
        // }
    }

    private async _removeTag(tag: string) {
        if (!this.vault || !this.record) {
            throw "vault or record member not set";
        }
        const confirmed = await confirm($l("Do you want to remove this tag?"), $l("Remove"), $l("Cancel"), {
            title: $l("Remove Tag")
        });
        if (confirmed) {
            app.updateRecord(this.vault, this.record, { tags: this.record.tags.filter(t => t !== tag) });
        }
    }

    private async _createTag() {
        if (!this.vault || !this.record) {
            throw "vault or record member not set";
        }
        const tag = await prompt("", {
            placeholder: $l("Enter Tag Name"),
            confirmLabel: $l("Add Tag"),
            preventDismiss: false,
            cancelLabel: ""
        });
        if (tag && !this.record.tags.includes(tag)) {
            app.updateRecord(this.vault, this.record, { tags: this.record.tags.concat([tag]) });
        }
    }

    private async _addTag() {
        if (!this.vault || !this.record) {
            throw "vault or record member not set";
        }
        const tags = app.tags.filter((tag: string) => !this.record!.tags.includes(tag));
        if (!tags.length) {
            return this._createTag();
        }

        const choice = await choose("", tags.concat([$l("New Tag")]), { preventDismiss: false });
        if (choice == tags.length) {
            return this._createTag();
        }

        const tag = tags[choice];
        if (tag) {
            app.updateRecord(this.vault, this.record, { tags: this.record.tags.concat([tag]) });
        }
    }

    private _nameEnter() {
        this._nameInput.blur();
    }

    _activated() {
        setTimeout(() => {
            animateCascade(this.$$(".animate"), { fullDuration: 800, fill: "both" });
        }, 100);
    }

    private _dismissWarning() {
        app.updateRecord(this.vault!, this.record!, {});
    }

    private async _share() {
        const vault = await this._shareDialog.show([this.record!]);
        if (vault && vault.members.length === 1) {
            router.go(`vault/${vault.id}`);
        }
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
        app.updateRecord(this.vault!, this.record!, {
            name: this._nameInput.value,
            fields: [...this._fieldNameInputs].map((inp: Input, i: number) => {
                return { name: inp.value, value: this._fieldValueInputs[i].value };
            })
        });
        this._editing = false;
    }
}
