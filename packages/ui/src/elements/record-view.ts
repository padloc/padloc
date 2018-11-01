import { AccountInfo } from "@padlock/core/lib/auth.js";
import { Record, Field } from "@padlock/core/lib/data.js";
import { Vault } from "@padlock/core/lib/vault.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { formatDateFromNow } from "../util.js";
import { shared, mixins, config } from "../styles";
import { confirm, prompt, choose, openField, generate, getDialog } from "../dialog.js";
import { animateCascade } from "../animation.js";
import { app, router } from "../init.js";
import { BaseElement, element, html, property, query, listen } from "./base.js";
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

    @query("#nameInput")
    _nameInput: Input;

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
        const isShared = app.mainVault && vault.id !== app.mainVault.id;
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
                padding: 10px;
            }

            #background {
                ${mixins.fullbleed()}
            }

            header > pl-input {
                flex: 1;
                width: 0;
            }

            .title {
                display: flex;
                align-items: center;
            }

            .name {
                flex: 1;
                font-size: 150%;
            }

            .tags {
                padding: 0 8px;
            }

            pl-record-field {
                transform: translate3d(0, 0, 0);
                margin: 6px;
                border-bottom: solid 1px #eee;
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
                font-size: var(--font-size-small);
                color: #888;
            }

            .updated::before {
                font-family: FontAwesome;
                font-size: 80%;
                content: "\\f303\ ";
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

        <div class="title">
            <pl-input
                id="nameInput"
                class="name tap"
                value="${name}"
                placeholder="${$l("Enter Record Name")}"
                select-on-focus=""
                autocapitalize=""
                ?readonly=${!permissions.write}
                @change=${() => this._updateName()}
                @enter=${() => this._nameEnter()}>
            </pl-input>

            <pl-icon
                icon="delete"
                class="tap"
                @click=${() => this._deleteRecord()}
                ?disabled=${!permissions.write}>
            </pl-icon>
        </div>

        <main id="main">

            <div class="tags animate">

                <div class="tag highlight tap"
                    flex
                    ?hidden=${!isShared}
                    @click=${() => this._openVault(vault!)}>

                    <pl-icon icon="vault"></pl-icon>

                    <div class="tag-name">${vaultName}</div>

                </div>

                <div class="tag warning" flex ?hidden=${permissions.write}>

                    <pl-icon icon="show"></pl-icon>

                    <div class="tag-name">${$l("read-only")}</div>

                </div>

                ${tags.map(
                    (tag: string) => html`
                    <div class="tag tap" flex @click=${() => this._removeTag(tag)}>

                        <pl-icon icon="tag"></pl-icon>

                        <div class="tag-name">${tag}</div>

                    </div>
                `
                )}

                <div class="tag ghost tap" flex @click=${() => this._addTag()}>

                    <pl-icon icon="add"></pl-icon>

                    <div>${$l("Tag")}</div>

                </div>

                <div
                    class="tag ghost tap"
                    flex
                    ?hidden=${!permissions.write || this.vault !== app.mainVault}
                    @click=${() => this._share()}>

                    <pl-icon icon="share"></pl-icon>

                    <div>${$l("Share")}</div>

                </div>

            </div>

            <section class="highlight tiles warning animate" ?hidden=${!removedMembers.length}>

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

                    <div class="animate">

                        <pl-record-field
                            .field=${field}
                            .record=${record}
                            .readonly=${!permissions.write}
                            @field-change=${(e: CustomEvent) => this._changeField(index, e.detail.changes)}
                            @field-delete=${() => this._deleteField(index)}>
                        </pl-record-field>

                    </div>

                `
                )}
            </div>

            <div class="add-button-wrapper animate" ?hidden=${!permissions.write}>

                <button class="add-button tap" @click=${() => this._addField()}>

                    <pl-icon icon="add"></pl-icon>

                    <div>${$l("Add Field")}</div>

                </button>

            </div>

            <div class="flex"></div>

            <div class="updated animate">
                ${formatDateFromNow(updated)}
                ${updatedByMember && " " + $l("by {0}", updatedByMember.email)}
            </div>

        </main>
`;
    }

    _didRender() {
        setTimeout(() => {
            if (this.record && !this.record.name) {
                this._nameInput.focus();
            }
        }, 500);
    }

    _updateName() {
        if (!this.vault || !this.record) {
            throw "vault or record member not set";
        }
        app.updateRecord(this.vault, this.record, { name: this._nameInput.value });
    }

    private async _deleteField(index: number) {
        if (!this.vault || !this.record) {
            throw "vault or record member not set";
        }
        const confirmed = await confirm($l("Are you sure you want to delete this field?"), $l("Delete"));
        const fields = this.record.fields.filter((_, i) => i !== index);
        if (confirmed) {
            app.updateRecord(this.vault, this.record, { fields: fields });
        }
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
        if (!this.vault || !this.record) {
            throw "vault or record member not set";
        }
        const result = await openField(field, true);
        switch (result.action) {
            case "generate":
                const value = await generate();
                field.value = value;
                field.name = result.name;
                this._addField(field);
                break;
            case "edit":
                Object.assign(field, result);
                app.updateRecord(this.vault, this.record, { fields: this.record.fields.concat([field]) });
                break;
        }
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

    edit() {
        this._nameInput.focus();
    }
}
