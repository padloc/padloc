import "../styles/shared.js";
import { BaseElement, html } from "./base.js";
import { applyMixins } from "@padlock/core/lib/util.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import "./icon.js";
import "./input.js";
import "./record-field.js";
import "./dialog-field.js";
import { LocaleMixin, DialogMixin, DataMixin, AnimationMixin } from "../mixins";

class RecordView extends applyMixins(BaseElement, DataMixin, LocaleMixin, DialogMixin, AnimationMixin) {
    static get template() {
        return html`
        <style include="shared">
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
            <pl-icon icon="close" class="tap" on-click="close"></pl-icon>
            <pl-input id="nameInput" class="name tap" value="[[ record.name ]]" placeholder="[[ \$l('Enter Record Name') ]]" select-on-focus="" autocapitalize="" on-change="_updateName" on-enter="_nameEnter"></pl-input>
            <pl-icon icon="delete" class="tap" on-click="_deleteRecord"></pl-icon>
        </header>

        <main id="main">
            <div class="tags animate">
                <template is="dom-repeat" items="[[ record.tags ]]">
                    <div class="tag tap" on-click="_removeTag">
                        <div class="tag-name">[[ item ]]</div>
                        <pl-icon icon="cancel"></pl-icon>
                    </div>
                </template>
                <div class="tag add tap" on-click="_addTag">
                    <pl-icon icon="tag"></pl-icon>
                    <div>[[ \$l("Add Tag") ]]</div>
                </div>
            </div>
            <div class="fields">
                <template is="dom-repeat" items="[[ record.fields ]]" id="fieldList">
                    <div class="animate">
                        <pl-record-field field="[[ item ]]" record="[[ record ]]" on-field-change="_updateRecord" on-field-delete="_deleteField"></pl-record-field>
                    </div>
                </template>
            </div>
            <div class="add-button-wrapper animate">
                <button class="add-button tap" on-click="_addField">
                    <pl-icon icon="add"></pl-icon>
                    <div>[[ \$l("Add Field") ]]</div>
                </button>
            </div>
        </main>

        <div class="rounded-corners"></div>
`;
    }

    static get is() {
        return "pl-record-view";
    }

    static get properties() {
        return {
            record: {
                type: Object,
                notify: true,
                observer: "_recordChanged"
            }
        };
    }

    static get observers() {
        return ["_lockedChanged(state.locked)"];
    }

    _lockedChanged() {
        if (this.state.locked) {
            this.record = null;
            const fieldDialog = this.getSingleton("pl-dialog-field");
            fieldDialog.open = false;
            fieldDialog.field = null;
        }
    }

    _recordChanged() {
        setTimeout(() => {
            if (this.record && !this.record.name) {
                this.$.nameInput.focus();
            }
        }, 500);
    }

    _updateName() {
        this.record.name = this.$.nameInput.value;
        this._updateRecord();
    }

    _updateRecord() {
        this.app.updateRecord(this.record);
    }

    _deleteField(e) {
        this.confirm($l("Are you sure you want to delete this field?"), $l("Delete")).then(confirmed => {
            if (confirmed) {
                this.record.fields.splice(e.model.index, 1);
                this._updateRecord();
            }
        });
    }

    _deleteRecord() {
        this.confirm($l("Are you sure you want to delete this record?"), $l("Delete")).then(confirmed => {
            if (confirmed) {
                this.app.deleteRecord(this.record);
            }
        });
    }

    _addField(field = { name: "", value: "", masked: false }) {
        this.lineUpDialog("pl-dialog-field", d => d.openField(field, true)).then(result => {
            switch (result.action) {
                case "generate":
                    this.generate().then(value => {
                        field.value = value;
                        field.name = result.name;
                        this._addField(field);
                    });
                    break;
                case "edited":
                    this.push("record.fields", field);
                    this._updateRecord();
                    break;
            }
        });
    }

    _fieldButtonClicked() {
        this._addField();
    }

    _hasTags() {
        return !!this.record.tags.length;
    }

    _removeTag(e) {
        this.confirm($l("Do you want to remove this tag?"), $l("Remove"), $l("Cancel"), {
            title: $l("Remove Tag")
        }).then(confirmed => {
            if (confirmed) {
                this.record.removeTag(e.model.item);
                this._updateRecord();
            }
        });
    }

    _createTag() {
        return this.prompt("", $l("Enter Tag Name"), "text", $l("Add Tag"), false, false).then(tag => {
            if (tag) {
                this.record.addTag(tag);
                this._updateRecord();
            }
        });
    }

    _addTag() {
        const tags = this.state.currentStore.tags.filter(tag => !this.record.hasTag(tag));
        if (!tags.length) {
            return this._createTag();
        }

        return this.choose("", tags.concat([$l("New Tag")]), { preventDismiss: false }).then(choice => {
            if (choice == tags.length) {
                return this._createTag();
            }

            const tag = tags[choice];
            if (tag) {
                this.record.addTag(tag);
                this._updateRecord();
            }
        });
    }

    _nameEnter() {
        this.$.nameInput.blur();
    }

    animate() {
        setTimeout(() => {
            this.animateCascade(this.root.querySelectorAll(".animate"), { fullDuration: 800, fill: "both" });
        }, 100);
    }

    close() {
        this.dispatchEvent(new CustomEvent("record-close"));
    }

    edit() {
        this.$.nameInput.focus();
    }
}

window.customElements.define(RecordView.is, RecordView);
