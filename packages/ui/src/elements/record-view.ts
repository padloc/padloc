import { Store, SharedStore, Record, Field } from "@padlock/core/lib/data.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { formatDateFromNow } from "@padlock/core/lib/util.js";
import sharedStyles from "../styles/shared.js";
import { View } from "./view.js";
import { confirm, prompt, choose, openField, generate, getDialog } from "../dialog.js";
import { animateCascade } from "../animation.js";
import { app, router } from "../init.js";
import { html, property, query, listen } from "./base.js";
import "./icon.js";
import { Input } from "./input.js";
import "./record-field.js";
import "./field-dialog.js";
import "./share-dialog.js";

export class RecordView extends View {
    @property() store: Store | null = null;
    @property() record: Record | null = null;

    @query("#nameInput") _nameInput: Input;

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
            this.requestRender();
        }
    }

    _shouldRender() {
        return super._shouldRender() && !!this.record;
    }

    _render({ record, store }: this) {
        const { name, fields, tags, updated, updatedBy } = record!;
        store = store!;
        const permissions = store instanceof SharedStore ? store.permissions : { read: true, write: true };
        const oldAccessors = store instanceof SharedStore ? store.getOldAccessors(record!) : [];

        return html`
        <style>

            ${sharedStyles}

            :host {
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                position: relative;
                @apply --fullbleed;
                transition: background 0.5s;
                background: var(--color-quaternary);
            }

            #background {
                @apply --fullbleed;
            }

            header > pl-input {
                flex: 1;
                width: 0;
            }

            .name {
                font-weight: bold;
                text-align: center;
            }

            .tags {
                padding: 0 8px;
            }

            pl-record-field, .add-button-wrapper {
                transform: translate3d(0, 0, 0);
                margin: 6px;
                @apply --card;
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
        </style>

        <header>

            <pl-icon icon="close" class="tap" on-click="${() => router.back()}"></pl-icon>

            <pl-input
                id="nameInput"
                class="name tap"
                value="${name}"
                placeholder="${$l("Enter Record Name")}"
                select-on-focus=""
                autocapitalize=""
                readonly?="${!permissions.write}"
                on-change="${() => this._updateName()}"
                on-enter="${() => this._nameEnter()}">
            </pl-input>

            <pl-icon
                icon="delete"
                class="tap"
                on-click="${() => this._deleteRecord()}"
                disabled?="${!permissions.write}">
            </pl-icon>

        </header>

        <main id="main">

            <div class="tags animate">

                <div class="tag highlight tap"
                    flex
                    hidden?="${store === app.mainStore}"
                    on-click="${() => this._openStore(store!)}">

                    <pl-icon icon="group"></pl-icon>

                    <div class="tag-name">${store.name}</div>

                </div>

                <div class="tag warning" flex hidden?="${permissions.write}">

                    <pl-icon icon="show"></pl-icon>

                    <div class="tag-name">${$l("read-only")}</div>

                </div>

                ${tags.map(
                    (tag: string) => html`
                    <div class="tag tap" flex on-click="${() => this._removeTag(tag)}">

                        <pl-icon icon="tag"></pl-icon>

                        <div class="tag-name">${tag}</div>

                    </div>
                `
                )}

                <div class="tag ghost tap" flex on-click="${() => this._addTag()}">

                    <pl-icon icon="add"></pl-icon>

                    <div>${$l("Tag")}</div>

                </div>

                <div class="tag ghost tap" flex hidden?="${this.store !== app.mainStore}" on-click="${() =>
            this._share()}">

                    <pl-icon icon="share"></pl-icon>

                    <div>${$l("Share")}</div>

                </div>

            </div>

            <section class="highlight tiles warning animate" hidden?="${!oldAccessors.length}">

                <div class="info">

                    <pl-icon class="info-icon" icon="error"></pl-icon>

                    <div class="info-body">

                        <div class="info-text">${$l(
                            "{0} users have been removed from the '{1}' group since this item was last updated. " +
                                "Please update any sensitive information as soon as possible!",
                            oldAccessors.length.toString(),
                            store.name
                        )}</div>

                    </div>

                </div>

                <button class="tap" on-click="${() => this._dismissWarning()}">${$l("Dismiss")}</button>

            </section>

            <div class="fields">

                ${fields.map(
                    (field: Field, index: number) => html`

                    <div class="animate">

                        <pl-record-field
                            field="${field}"
                            record="${record}"
                            readonly="${!permissions.write}"
                            on-field-change="${(e: CustomEvent) => this._changeField(index, e.detail.changes)}"
                            on-field-delete="${() => this._deleteField(index)}">
                        </pl-record-field>

                    </div>

                `
                )}
            </div>

            <div class="add-button-wrapper animate" hidden?="${!permissions.write}">

                <button class="add-button tap" on-click="${() => this._addField()}">

                    <pl-icon icon="add"></pl-icon>

                    <div>${$l("Add Field")}</div>

                </button>

            </div>

            <div class="updated animate">
                ${formatDateFromNow(updated)}
                ${updatedBy && " " + $l("by {0}", updatedBy.email)}
            </div>

        </main>

        <div class="rounded-corners"></div>
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
        if (!this.store || !this.record) {
            throw "store or record member not set";
        }
        app.updateRecord(this.store, this.record, { name: this._nameInput.value });
    }

    private async _deleteField(index: number) {
        if (!this.store || !this.record) {
            throw "store or record member not set";
        }
        const confirmed = await confirm($l("Are you sure you want to delete this field?"), $l("Delete"));
        const fields = this.record.fields.filter((_, i) => i !== index);
        if (confirmed) {
            app.updateRecord(this.store, this.record, { fields: fields });
        }
    }

    private async _changeField(index: number, changes: { name?: string; value?: string; masked?: boolean }) {
        if (!this.store || !this.record) {
            throw "store or record member not set";
        }
        const fields = [...this.record.fields];
        fields[index] = Object.assign({}, fields[index], changes);
        app.updateRecord(this.store, this.record, { fields: fields });
    }

    private async _deleteRecord() {
        if (!this.store || !this.record) {
            throw "store or record member not set";
        }
        const confirmed = await confirm($l("Are you sure you want to delete this record?"), $l("Delete"));
        if (confirmed) {
            app.deleteRecords(this.store, [this.record]);
            router.back();
        }
    }

    private async _addField(field = { name: "", value: "", masked: false }) {
        if (!this.store || !this.record) {
            throw "store or record member not set";
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
                app.updateRecord(this.store, this.record, { fields: this.record.fields.concat([field]) });
                break;
        }
    }

    private async _removeTag(tag: string) {
        if (!this.store || !this.record) {
            throw "store or record member not set";
        }
        const confirmed = await confirm($l("Do you want to remove this tag?"), $l("Remove"), $l("Cancel"), {
            title: $l("Remove Tag")
        });
        if (confirmed) {
            app.updateRecord(this.store, this.record, { tags: this.record.tags.filter(t => t !== tag) });
        }
    }

    private async _createTag() {
        if (!this.store || !this.record) {
            throw "store or record member not set";
        }
        const tag = await prompt("", {
            placeholder: $l("Enter Tag Name"),
            confirmLabel: $l("Add Tag"),
            preventDismiss: false,
            cancelLabel: ""
        });
        if (tag && !this.record.tags.includes(tag)) {
            app.updateRecord(this.store, this.record, { tags: this.record.tags.concat([tag]) });
        }
    }

    private async _addTag() {
        if (!this.store || !this.record) {
            throw "store or record member not set";
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
            app.updateRecord(this.store, this.record, { tags: this.record.tags.concat([tag]) });
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
        app.updateRecord(this.store!, this.record!, {});
    }

    private async _share() {
        await getDialog("pl-share-dialog").show([this.record], this.store);
    }

    private _openStore(store: Store) {
        router.go(`store/${store.id}`);
    }

    edit() {
        this._nameInput.focus();
    }
}

window.customElements.define("pl-record-view", RecordView);
