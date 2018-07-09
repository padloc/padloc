import { html } from "@polymer/lit-element";
import { Record, Field } from "@padlock/core/lib/data.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import sharedStyles from "../styles/shared.js";
import { View } from "./view.js";
import { confirm, prompt, choose, lineUpDialog, generate, getDialog } from "../dialog.js";
import { animateCascade } from "../animation.js";
import { app } from "../init.js";
import "./icon.js";
import "./input.js";
import "./record-field.js";
import "./dialog-field.js";

class RecordView extends View {
    record: Record | null;

    static get properties() {
        return {
            store: Object,
            record: Object
        };
    }

    connectedCallback() {
        super.connectedCallback();
        app.addEventListener("lock", () => {
            this.record = null;
            const fieldDialog = getDialog("pl-dialog-field");
            fieldDialog.open = false;
            fieldDialog.field = null;
        });
        app.addEventListener("record-changed", (e: CustomEvent) => {
            if (e.detail.record === this.record) {
                this.requestRender();
            }
        });
    }

    _shouldRender(props: { record?: Record }) {
        return !!props.record;
    }

    _render(props: { record: Record }) {
        const record = props.record;

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

            .tags {
                display: flex;
                overflow-x: auto;
                margin: 8px 0;
                padding: 0 8px;
                /* align-items: center; */
                -webkit-overflow-scrolling: touch;
            }

            .tags::after {
                content: "";
                display: block;
                width: 1px;
                flex: none;
            }

            .tag {
                background: var(--color-foreground);
                color: var(--color-background);
                font-weight: bold;
                border-radius: var(--border-radius);
                margin-right: 6px;
                display: flex;
                align-items: center;
                font-size: var(--font-size-tiny);
                white-space: nowrap;
                line-height: 0;
                padding-left: 12px;
            }

            .tags pl-icon {
                width: 30px;
                height: 30px;
            }

            .tag.add {
                padding-left: 0;
                padding-right: 12px;
                border: dashed 1px;
                background: transparent;
                color: var(--color-foreground);
            }
        </style>

        <header>

            <pl-icon icon="close" class="tap" on-click="${() => this.close()}"></pl-icon>

            <pl-input
                id="nameInput"
                class="name tap"
                value="${record.name}"
                placeholder="${$l("Enter Record Name")}"
                select-on-focus=""
                autocapitalize=""
                on-change="${() => this._updateName()}"
                on-enter="${() => this._nameEnter()}">
            </pl-input>

            <pl-icon icon="delete" class="tap" on-click="${() => this._deleteRecord()}"></pl-icon>

        </header>

        <main id="main">

            <div class="tags animate">

                ${record.tags.map(
                    (tag: string) => html`
                    <div class="tag tap" on-click="${() => this._removeTag(tag)}">
                        <div class="tag-name">${tag}</div>
                        <pl-icon icon="cancel"></pl-icon>
                    </div>
                `
                )}

                <div class="tag add tap" on-click="${() => this._addTag()}">

                    <pl-icon icon="tag"></pl-icon>

                    <div>${$l("Add Tag")}</div>

                </div>

            </div>

            <div class="fields">

                ${record.fields.map(
                    (field: Field, index: number) => html`

                    <div class="animate">

                        <pl-record-field
                            field="${field}"
                            record="${record}"
                            on-field-change="${() => this._updateRecord()}"
                            on-field-delete="${() => this._deleteField(index)}">
                        </pl-record-field>

                    </div>

                `
                )}
            </div>

            <div class="add-button-wrapper animate">

                <button class="add-button tap" on-click="${() => this._addField()}">

                    <pl-icon icon="add"></pl-icon>

                    <div>${$l("Add Field")}</div>

                </button>

            </div>

        </main>

        <div class="rounded-corners"></div>
`;
    }

    _didRender() {
        setTimeout(() => {
            if (this.record && !this.record.name) {
                this.shadowRoot.querySelector("#nameInput").focus();
            }
        }, 500);
    }

    _updateName() {
        if (!this.record) {
            return;
        }
        app.updateRecord(this.store, this.record, { name: this.shadowRoot.querySelector("#nameInput").value });
    }

    async _deleteField(index: number) {
        if (!this.record) {
            return;
        }
        const confirmed = await confirm($l("Are you sure you want to delete this field?"), $l("Delete"));
        const fields = this.record.fields.filter((_, i) => i !== index);
        if (confirmed) {
            app.updateRecord(this.store, this.record, { fields: fields });
        }
    }

    async _deleteRecord() {
        if (!this.record) {
            return;
        }
        const confirmed = await confirm($l("Are you sure you want to delete this record?"), $l("Delete"));
        if (confirmed) {
            app.deleteRecords(this.store, this.record);
        }
    }

    async _addField(field = { name: "", value: "", masked: false }) {
        if (!this.record) {
            return;
        }
        const result = await lineUpDialog("pl-dialog-field", (d: any) => d.openField(field, true));
        switch (result.action) {
            case "generate":
                const value = await generate();
                field.value = value;
                field.name = result.name;
                this._addField(field);
                break;
            case "edited":
                app.updateRecord(this.store, this.record, { fields: this.record.fields.concat([field]) });
                break;
        }
    }

    _fieldButtonClicked() {
        this._addField();
    }

    _hasTags() {
        return !!this.record && !!this.record.tags.length;
    }

    async _removeTag(tag: string) {
        if (!this.record) {
            return;
        }
        const confirmed = await confirm($l("Do you want to remove this tag?"), $l("Remove"), $l("Cancel"), {
            title: $l("Remove Tag")
        });
        if (confirmed) {
            app.updateRecord(this.store, this.record, { tags: this.record.tags.filter(t => t !== tag) });
        }
    }

    async _createTag() {
        if (!this.record) {
            return;
        }
        const tag = await prompt("", $l("Enter Tag Name"), "text", $l("Add Tag"), false, false);
        if (tag && !this.record.tags.includes(tag)) {
            app.updateRecord(this.store, this.record, { tags: this.record.tags.concat([tag]) });
        }
    }

    async _addTag() {
        if (!this.record) {
            return;
        }
        const tags = this.store.tags.filter((tag: string) => !this.record!.tags.includes(tag));
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

    _nameEnter() {
        this.shadowRoot.querySelector("#nameInput").blur();
    }

    animate() {
        setTimeout(() => {
            animateCascade(this.shadowRoot.querySelectorAll(".animate"), { fullDuration: 800, fill: "both" });
        }, 100);
    }

    close() {
        this.dispatchEvent(new CustomEvent("record-close"));
    }

    edit() {
        this.shadowRoot.querySelector("#nameInput").focus();
    }
}

window.customElements.define("pl-record-view", RecordView);
