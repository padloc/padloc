import { until } from "lit-html/directives/until";
import { repeat } from "lit-html/directives/repeat";
import { VaultItemID, Field } from "@padloc/core/src/item";
import { translate as $l } from "@padloc/locale/src/translate";
import { AttachmentInfo } from "@padloc/core/src/attachment";
import { parseURL } from "@padloc/core/src/otp";
import { formatDateFromNow, fileIcon, fileSize } from "../lib/util";
import { alert, confirm, dialog } from "../lib/dialog";
import { app, router } from "../globals";
import { shared } from "../styles";
import { setClipboard } from "../lib/clipboard";
import { BaseElement, element, html, css, property, query, queryAll, observe } from "./base";
import "./icon";
import { Input } from "./input";
import { TagsInput } from "./tags-input";
import { MoveItemsDialog } from "./move-items-dialog";
import { FieldElement } from "./field";
import "./field";
import { Generator } from "./generator";
import { AttachmentDialog } from "./attachment-dialog";
import { UploadDialog } from "./upload-dialog";
import { QRDialog } from "./qr-dialog";
import { FieldTypeDialog } from "./field-type-dialog";
import "./scroller";
import "./button";

@element("pl-item-view")
export class ItemView extends BaseElement {
    @property()
    itemId: VaultItemID = "";

    @property()
    isNew: boolean = false;

    get _item() {
        const found = (this.itemId && app.getItem(this.itemId)) || null;
        return found && found.item;
    }

    get _vault() {
        const found = (this.itemId && app.getItem(this.itemId)) || null;
        return found && found.vault;
    }

    @property({ reflect: true, attribute: "editing" })
    private _editing: boolean = false;

    @property()
    private _fields: Field[] = [];

    @query("#nameInput")
    private _nameInput: Input;

    @query("pl-tags-input")
    private _tagsInput: TagsInput;

    @queryAll("pl-field")
    private _fieldInputs: FieldElement[];

    @query("input[type='file']")
    private _fileInput: HTMLInputElement;

    @dialog("pl-move-items-dialog")
    private _moveItemsDialog: MoveItemsDialog;

    @dialog("pl-generator")
    private _generator: Generator;

    @dialog("pl-attachment-dialog")
    private _attachmentDialog: AttachmentDialog;

    @dialog("pl-upload-dialog")
    private _uploadDialog: UploadDialog;

    @dialog("pl-qr-dialog")
    private _qrDialog: QRDialog;

    @dialog("pl-field-type-dialog")
    private _fieldTypeDialog: FieldTypeDialog;

    private _draggingIndex = -1;

    private _dragOverIndex = -1;

    async addAttachment() {
        await this.updateComplete;

        if (this._vault!.id === app.mainVault!.id && !app.account!.quota.storage && app.billingEnabled) {
            this.dispatch("get-premium", {
                message: $l("Upgrade to Premium now and get 1GB of encrypted file storage!"),
                icon: "storage",
            });
            return;
        }

        this._fileInput.click();
    }

    static styles = [
        shared,
        css`
            :host {
                display: block;
                position: relative;
                background: var(--color-background);
            }

            header {
                overflow: visible;
                z-index: 10;
                --spacing: 0.3em;
                --input-padding: 0.3em 0.8em;
                font-weight: bold;
            }

            :host(:not([editing])) pl-field:hover {
                background: var(--color-shade-2);
            }

            pl-tags-input {
                margin: 0.5em 1.5em;
            }

            .favorite-button {
                --button-foreground: var(--color-shade-5);
                --button-toggled-background: transparent;
                --button-toggled-foreground: var(--color-red);
            }

            .back-button {
                margin-right: -1em;
            }

            :host(.dragging) .content > * {
                will-change: transform;
                transition: transform 0.2s;
            }

            pl-field.dragover::after {
                content: "";
                display: block;
                height: 1em;
                border: dashed 2px var(--color-highlight);
                width: 100%;
                box-sizing: border-box;
                position: absolute;
                bottom: -1em;
                border-radius: 0.5em;
            }

            pl-field.dragover ~ * {
                transform: translate3d(0, 40px, 0);
            }

            @media (max-width: 700px) {
                .outer {
                    padding: 0;
                }

                .inner {
                    border-radius: 0;
                    max-width: 100%;
                    width: 100%;
                    height: 100%;
                }

                .scrim {
                    display: none;
                }
            }
        `,
    ];

    render() {
        if (app.state.locked || !this._item || !this._vault) {
            return html`
                <div class="fullbleed centering layout">
                    <div>${$l("No item selected")}</div>
                </div>
            `;
        }

        const { updated, updatedBy } = this._item!;
        const vault = this._vault!;
        const org = vault.org && app.getOrg(vault.org.id);
        const readonly = !app.hasWritePermissions(vault);
        const updatedByMember = org && org.getMember({ id: updatedBy });
        const attachments = this._item!.attachments || [];
        const isFavorite = app.account!.favorites.has(this.itemId);

        return html`
            <div class="fullbleed vertical layout">
                <header class="padded center-aligning horizontal layout">
                    <pl-button
                        class="transparent round narrow-only back-button"
                        @click=${() => router.go("items")}
                        ?hidden=${this._editing}
                    >
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>

                    <pl-input
                        id="nameInput"
                        class="name-input ${!this._editing ? "large transparent" : "dashed"} stretch"
                        .placeholder=${$l("Enter Item Name")}
                        ?readonly=${!this._editing}
                    >
                    </pl-input>

                    <div class="horizontal layout" ?hidden=${this._editing}>
                        <pl-button
                            @click=${() => this._setFavorite(!isFavorite)}
                            class="transparent round favorite-button"
                            .label=${$l("Favorite")}
                            toggleable
                            .toggled=${isFavorite}
                        >
                            <pl-icon icon="favorite"></pl-icon>
                        </pl-button>

                        <pl-button
                            class="transparent round"
                            @click=${() => this.edit()}
                            ?disabled=${readonly}
                            .label=${$l("Edit")}
                        >
                            <pl-icon icon="edit"></pl-icon>
                        </pl-button>
                    </div>

                    <div class="horizontal layout" ?hidden=${!this._editing}>
                        <pl-button .label=${$l("Field")} class="transparent round" @click=${() => this._addField()}>
                            <pl-icon icon="add"></pl-icon>
                        </pl-button>

                        <pl-button .label=${$l("Attachment")} class="transparent round" @click=${this.addAttachment}>
                            <pl-icon icon="attachment"></pl-icon>
                        </pl-button>

                        <pl-button
                            .label=${$l("Delete")}
                            class="transparent round"
                            @click=${this._deleteItem}
                            ?hidden=${this.isNew}
                        >
                            <pl-icon icon="delete"></pl-icon>
                        </pl-button>

                        <pl-button .label=${$l("Move")} class="transparent round" @click=${this._move}>
                            <pl-icon icon="share"></pl-icon>
                        </pl-button>
                    </div>
                </header>

                <pl-scroller class="stretch">
                    <pl-tags-input
                        .editing=${this._editing}
                        .vault=${this._vault}
                        @move=${this._move}
                        class="small"
                    ></pl-tags-input>

                    <div class="margined">
                        ${repeat(
                            this._fields,
                            (field) => `${this.itemId}_${field.name}_${field.type}`,
                            (field: Field, index: number) => html`
                                <pl-field
                                    class="small"
                                    .name=${field.name}
                                    .value=${field.value}
                                    .type=${field.type}
                                    .editing=${this._editing}
                                    @edit=${() => this._editField(index)}
                                    @copy-clipboard=${() => setClipboard(this._item!, field)}
                                    @remove=${() => this._removeField(index)}
                                    @generate=${() => this._generateValue(index)}
                                    @get-totp-qr=${() => this._getTotpQR(index)}
                                    @dragstart=${(e: DragEvent) => this._dragstart(e, index)}
                                    @dragenter=${(e: DragEvent) => this._dragenter(e, index)}
                                    @dragover=${(e: DragEvent) => this._dragover(e)}
                                    @dragend=${(e: DragEvent) => this._dragend(e)}
                                    @drop=${(e: DragEvent) => this._drop(e)}
                                >
                                </pl-field>
                            `
                        )}
                    </div>

                    <div class="margined">
                        ${attachments.map(
                            (a) => html`
                                <div
                                    class="small rounded spacing horizontal center-aligning layout ${this._editing
                                        ? ""
                                        : "tap"}"
                                    @click=${() => this._openAttachment(a)}
                                >
                                    <pl-icon
                                        class="large margined"
                                        icon=${fileIcon(a.type)}
                                        ?hidden=${this._editing}
                                    ></pl-icon>

                                    <pl-button
                                        class="round slim transparent"
                                        ?hidden=${!this._editing}
                                        @click=${() => this._deleteAttachment(a)}
                                    >
                                        <pl-icon icon="remove"></pl-icon>
                                    </pl-button>

                                    <div class="stretch vertically-padded">
                                        <div class="bold ellipsis">${a.name}</div>
                                        <div class="spacer"></div>
                                        <div class="small">${fileSize(a.size)}</div>
                                    </div>
                                </div>
                            `
                        )}
                    </div>

                    <div class="double-margined spacing faded tiny centering horizontal layout">
                        <pl-icon icon="edit"></pl-icon>
                        <div>
                            ${until(formatDateFromNow(updated!))}
                            ${updatedByMember && " " + $l("by {0}", updatedByMember.email)}
                        </div>
                    </div>
                </pl-scroller>

                <div class="padded spacing evenly stretching horizontal layout" ?hidden=${!this._editing}>
                    <pl-button class="primary slim spacing horizontal layout" @click=${this.save}>
                        <pl-icon icon="check"></pl-icon>
                        <div>${$l("Save")}</div>
                    </pl-button>

                    <pl-button class="slim spacing horizontal layout" @click=${this.cancelEdit}>
                        <pl-icon icon="cancel"></pl-icon>
                        <div>${$l("Cancel")}</div>
                    </pl-button>
                </div>

                <input type="file" hidden @change=${this._attachFile} />
            </div>
        `;
    }

    async edit() {
        if (!this._vault || !app.hasWritePermissions(this._vault!)) {
            return;
        }
        this._editing = true;
        await this.updateComplete;
        setTimeout(() => this._nameInput.focus(), 100);
    }

    async cancelEdit() {
        if (this.isNew) {
            app.deleteItems([this._item!]);
        } else {
            this._fields = this._getFields();
            await this.updateComplete;
            this._editing = false;
            this._itemChanged();
        }
        this.isNew = false;
    }

    save() {
        app.updateItem(this._item!, {
            name: this._nameInput.value,
            fields: this._getFields(),
            tags: this._tagsInput.tags,
        });
        this._editing = false;
        this._itemChanged();
        this.isNew = false;
    }

    private _getFields() {
        return [...this._fieldInputs].map((fieldEl: FieldElement) => {
            return new Field({
                name: fieldEl.name,
                value: fieldEl.value,
                type: fieldEl.type,
            });
        });
    }

    @observe("itemId")
    private _itemChanged() {
        if (!this._nameInput) {
            return;
        }
        if (this._item) {
            this._nameInput.value = this._item.name;
            this._fields = this._item.fields.map((f) => new Field({ ...f }));
            this._tagsInput.tags = [...this._item.tags];
        } else {
            this._nameInput.value = "";
            this._fields = [];
            this._tagsInput.tags = [];
        }
    }

    private _removeField(index: number) {
        this._fields = this._fields.filter((_, i) => i !== index);
    }

    private async _deleteItem() {
        const confirmed = await confirm($l("Are you sure you want to delete this item?"), $l("Delete"), $l("Cancel"), {
            title: $l("Delete Vault Item"),
            type: "destructive",
        });
        if (confirmed) {
            app.deleteItems([this._item!]);
            router.go("items");
        }
    }

    private async _addField() {
        const fieldDef = await this._fieldTypeDialog.show();

        if (!fieldDef) {
            return;
        }

        this._fields.push(new Field({ name: fieldDef.name, value: "", type: fieldDef.type }));
        this.requestUpdate();
        await this.updateComplete;
        setTimeout(() => this._fieldInputs[this._fields.length - 1].focus(), 100);
    }

    private async _move() {
        if (!app.hasWritePermissions(this._vault!)) {
            return;
        }
        if (this._item!.attachments.length) {
            await alert($l("Items with attachments cannot be moved!"), { type: "warning" });
        } else {
            const movedItems = await this._moveItemsDialog.show([{ item: this._item!, vault: this._vault! }]);
            if (movedItems && movedItems.length) {
                router.go(`items/${movedItems[0].id}`);
            }
        }
    }

    private async _editField(index: number) {
        if (!app.hasWritePermissions(this._vault!)) {
            return;
        }
        this._editing = true;
        await this.updateComplete;
        this._fieldInputs[index].focus();
    }

    private async _generateValue(index: number) {
        const value = await this._generator.show();
        if (value) {
            this._fields[index].value = value;
            this.requestUpdate();
        }
    }

    private async _attachFile() {
        const file = this._fileInput.files![0];
        this._fileInput.value = "";
        if (!file) {
            return;
        }

        if (file.size > 5e6) {
            alert($l("The selected file is too large! Only files of up to 5 MB are supported."), {
                type: "warning",
            });
            return;
        }

        const att = await this._uploadDialog.show({ item: this.itemId, file });
        if (att) {
            this.requestUpdate();
            await alert($l("File uploaded successfully!"), { type: "success", title: "Upload Complete" });
        }
    }

    private async _openAttachment(info: AttachmentInfo) {
        if (this._editing) {
            return;
        }
        await this._attachmentDialog.show({ item: this.itemId, info });
    }

    private async _getTotpQR(index: number): Promise<void> {
        const data = await this._qrDialog.show();
        if (data) {
            try {
                const { secret } = parseURL(data);
                this._fields[index].value = secret;
            } catch (e) {
                await alert("Invalid Code! Please try again!", { type: "warning" });
                return this._getTotpQR(index);
            }
        }
    }

    private _setFavorite(favorite: boolean) {
        app.toggleFavorite(this.itemId, favorite);
        this.requestUpdate();
    }

    private async _deleteAttachment(a: AttachmentInfo) {
        const confirmed = await confirm(
            $l("Are you sure you want to delete this attachment?"),
            $l("Delete"),
            $l("Cancel"),
            {
                title: $l("Delete Attachment"),
                type: "destructive",
            }
        );
        if (confirmed) {
            await app.deleteAttachment(this.itemId!, a);
            this.requestUpdate();
        }
    }

    private _drop(e: DragEvent) {
        // console.log("drop", e, this._draggingIndex, this._dragOverIndex);
        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    private async _dragstart(event: DragEvent, index: number) {
        // console.log("dragstart", event);
        this._draggingIndex = index;
        this.dispatch("field-dragged", { item: this._item, index, event });
        (event.target as HTMLElement).classList.add("dragging");
        this.classList.add("dragging");
    }

    private _dragenter(e: DragEvent, index: number) {
        // console.log("dragenter", e);
        e.dataTransfer!.dropEffect = "move";

        this._dragOverIndex = index;

        for (const [i, field] of this._fieldInputs.entries()) {
            field.classList.toggle(
                "dragover",
                i === index && i !== this._draggingIndex && i !== this._draggingIndex - 1
            );
        }
    }

    private _dragover(e: DragEvent) {
        e.preventDefault();
    }

    private _dragend(_e: DragEvent) {
        // console.log("dragend", e, this._draggingIndex, this._dragOverIndex);

        if (this._draggingIndex !== -1 || this._dragOverIndex !== -1) {
            const field = this._fields[this._draggingIndex];
            this._fields.splice(this._draggingIndex, 1);
            const targetIndex =
                this._dragOverIndex >= this._draggingIndex ? this._dragOverIndex : this._dragOverIndex + 1;
            this._fields.splice(targetIndex, 0, field);
            this.requestUpdate();
        }

        for (const field of this._fieldInputs) {
            field.classList.remove("dragging");
            field.classList.remove("dragover");
        }
        this.classList.remove("dragging");
        this._dragOverIndex = -1;
        this._draggingIndex = -1;
    }
}
