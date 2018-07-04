import { html } from "@polymer/lit-element";
import { Record, Field } from "@padlock/core/lib/data.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import sharedStyles from "../styles/shared.js";
import { View } from "./view.js";
import { confirm, prompt, choose, lineUpDialog, generate } from "../dialog.js";
import { animateCascade } from "../animation.js";
import "./icon.js";
import "./input.js";
import "./record-field.js";
import "./dialog-field.js";

class RecordView extends View {
    record: Record | null;

    static get properties() {
        return {
            record: Object
        };
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

    _lockedChanged() {
        if (this.app.state.locked) {
            this.record = null;
            const fieldDialog = this.getSingleton("pl-dialog-field");
            fieldDialog.open = false;
            fieldDialog.field = null;
        }
    }

    _recordChanged() {
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
        this.record.name = this.shadowRoot.querySelector("#nameInput").value;
        this._updateRecord();
    }

    _updateRecord() {
        if (!this.record) {
            return;
        }
        this.app.updateRecord(this.record);
    }

    async _deleteField(index: number) {
        if (!this.record) {
            return;
        }
        const confirmed = await confirm($l("Are you sure you want to delete this field?"), $l("Delete"));
        if (confirmed) {
            this.record.fields.splice(index, 1);
            this._updateRecord();
        }
    }

    async _deleteRecord() {
        if (!this.record) {
            return;
        }
        const confirmed = confirm($l("Are you sure you want to delete this record?"), $l("Delete"));
        if (confirmed) {
            this.app.deleteRecord(this.record);
        }
    }

    async _addField(field = { name: "", value: "", masked: false }) {
        if (!this.record) {
            return;
        }
        const result = await lineUpDialog("pl-dialog-field", (d: FieldDialog) => d.openField(field, true));
        switch (result.action) {
            case "generate":
                const value = await generate();
                field.value = value;
                field.name = result.name;
                this._addField(field);
                break;
            case "edited":
                this.record.fields.push(field);
                this._updateRecord();
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
            this.record.removeTag(tag);
            this._updateRecord();
        }
    }

    async _createTag() {
        if (!this.record) {
            return;
        }
        const tag = await prompt("", $l("Enter Tag Name"), "text", $l("Add Tag"), false, false);
        if (tag) {
            this.record.addTag(tag);
            this._updateRecord();
        }
    }

    async _addTag() {
        if (!this.record) {
            return;
        }
        const tags = this.app.state.currentStore.tags.filter((tag: string) => !this.record!.hasTag(tag));
        if (!tags.length) {
            return this._createTag();
        }

        const choice = await choose("", tags.concat([$l("New Tag")]), { preventDismiss: false });
        if (choice == tags.length) {
            return this._createTag();
        }

        const tag = tags[choice];
        if (tag) {
            this.record.addTag(tag);
            this._updateRecord();
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
