import { until } from "lit-html/directives/until";
import { repeat } from "lit-html/directives/repeat";
import { VaultItemID, Field } from "@padloc/core/src/item";
import { translate as $l } from "@padloc/locale/src/translate";
import { AttachmentInfo } from "@padloc/core/src/attachment";
import { parseURL } from "@padloc/core/src/otp";
import { formatDateFromNow, fileIcon, fileSize } from "../lib/util";
import { alert, confirm, dialog } from "../lib/dialog";
import { app, router } from "../globals";
import { setClipboard } from "../lib/clipboard";
import { animateCascade } from "../lib/animation";
import { element, html, css, property, query, queryAll } from "./base";
import { Dialog } from "./dialog";
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
import { View } from "./view";

@element("pl-item-dialog")
export class ItemDialog extends Dialog<string, void> {
    @property()
    itemId: VaultItemID = "";

    get _item() {
        const found = (this.itemId && app.getItem(this.itemId)) || null;
        return found && found.item;
    }

    get _vault() {
        const found = (this.itemId && app.getItem(this.itemId)) || null;
        return found && found.vault;
    }

    @property({ reflect: true, attribute: "editing" })
    private _editing: Boolean = false;

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

    async show(itemId: string) {
        this._editing = false;
        this.itemId = itemId;
        await this.updateComplete;
        this._itemChanged();
        // Workaround for weird bug where name input is sometimes empty after opening dialog
        setTimeout(() => this._itemChanged(), 200);
        const promise = super.show();
        await this.updateComplete;
        animateCascade(this.$$(".content > *"));
        return promise;
    }

    async addAttachment() {
        await this.updateComplete;

        if (this._vault!.id === app.mainVault!.id && !app.account!.quota.storage && app.billingConfig) {
            this.dispatch("get-premium", {
                message: $l("Upgrade to Premium now and get 1GB of encrypted file storage!"),
                icon: "storage"
            });
            this.done();
            return;
        }

        this._fileInput.click();
    }

    dismiss() {
        super.dismiss();
        router.go("items");
    }

    static styles = [
        ...Dialog.styles,
        ...View.styles,
        css`
            .inner {
                max-width: 500px;
                background: var(--color-quaternary);
                display: flex;
                flex-direction: column;
                min-height: 500px;
                max-height: 100%;
            }

            .content {
                padding-bottom: 50px;
            }

            .content > * {
                margin: 12px;
            }

            .name {
                padding: 0 8px;
                margin: 0 8px;
                line-height: 40px;
                text-align: center;
            }

            :host([editing]) .name {
                border: dashed 1px var(--color-shade-3);
                text-align: left;
            }

            pl-field {
                position: relative;
            }

            .content > pl-tags-input {
                margin: 12px 16px;
            }

            :host(:not([editing])) pl-field:hover {
                background: #eee;
            }

            .updated {
                text-align: center;
                font-size: var(--font-size-tiny);
                color: var(--color-shade-4);
                font-weight: 600;
                margin: 30px;
            }

            .updated::before {
                font-family: FontAwesome;
                font-size: 80%;
                content: "\\f303";
                display: inline-block;
                margin-right: 4px;
            }

            .attachment {
                display: flex;
                align-items: center;
                padding: 12px;
                margin: 12px;
            }

            .attachment-body {
                flex: 1;
                width: 0;
            }

            .attachment .file-icon {
                font-size: 150%;
                margin: 0 4px 0 -4px;
            }

            .attachment-name {
                font-size: var(--font-size-small);
                font-weight: bold;
                line-height: 1.5em;
            }

            .attachment-size {
                font-size: var(--font-size-tiny);
            }

            .attachment-remove {
                margin: 0 8px 0 -8px;
            }

            .favorite {
                color: var(--color-secondary);
                opacity: 0.3;
                cursor: pointer;
                transition: transform 0.2s cubic-bezier(0.05, 0.7, 0.03, 3) 0s;
                transform: scale(0.9);
            }

            .favorite:hover {
                opacity: 0.6;
            }

            .favorite[active] {
                color: var(--color-negative);
                opacity: 1;
                transform: scale(1);
            }

            .editing {
                text-align: center;
                padding: 8px;
                margin: 0 0 0 12px;
                box-shadow: rgba(0, 0, 0, 0.3) 0 1px 3px;
                border-radius: var(--border-radius);
                background: rgba(255, 255, 255, 0.9);
            }

            .actions > button {
                font-size: var(--font-size-small);
                background: none;
                padding: 10px 8px 10px 0;
                border: dashed 1px;
                font-weight: bold;
            }

            .actions > button.negative {
                color: var(--color-negative);
                border-color: var(--color-negative);
            }

            .save-button,
            .cancel-button {
                flex: 1;
                max-width: 200px;
                min-width: 120px;
            }

            pl-field.dragging {
                opacity: 0.2;
            }

            :host(.dragging) .content > * {
                will-change: transform;
                transition: transform 0.2s;
            }

            pl-field.dragover::after {
                content: "";
                display: block;
                height: 30px;
                border: dashed 2px var(--color-primary);
                width: 100%;
                box-sizing: border-box;
                position: absolute;
                bottom: -45px;
                border-radius: var(--border-radius);
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
        `
    ];

    renderContent() {
        if (app.state.locked || !this._item || !this._vault) {
            return html``;
        }

        const { updated, updatedBy, favorited } = this._item!;
        const vault = this._vault!;
        const org = vault.org && app.getOrg(vault.org.id);
        const readonly = !app.hasWritePermissions(vault);
        const updatedByMember = org && org.getMember({ id: updatedBy });
        const attachments = this._item!.attachments || [];
        const isFavorite = favorited && favorited.includes(app.account!.id);

        return html`
            <header>
                <pl-icon icon="backward" class="tap close-icon" @click=${this.dismiss}></pl-icon>
                <pl-input
                    id="nameInput"
                    class="name flex"
                    .placeholder=${$l("Enter Item Name")}
                    ?readonly=${!this._editing}
                >
                </pl-input>
                <pl-icon
                    icon="favorite"
                    class="favorite"
                    ?active=${isFavorite}
                    @click=${() => this._setFavorite(!isFavorite)}
                ></pl-icon>
            </header>

            <div class="content">
                <pl-tags-input .editing=${this._editing} .vault=${this._vault} @move=${this._move}></pl-tags-input>

                ${repeat(
                    this._fields,
                    field => `${this.itemId}_${field.name}_${field.type}`,
                    (field: Field, index: number) => html`
                        <pl-field
                            class="item"
                            .name=${field.name}
                            .value=${field.value}
                            .type=${field.type}
                            .editing=${this._editing}
                            @edit=${() => this._editField(index)}
                            @copy=${() => setClipboard(this._item!, field)}
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
                ${attachments.map(
                    a => html`
                        <div
                            class="attachment item ${this._editing ? "" : "tap"}"
                            @click=${() => this._openAttachment(a)}
                        >
                            <pl-icon icon=${fileIcon(a.type)} class="file-icon" ?hidden=${this._editing}></pl-icon>
                            <pl-icon
                                icon="remove"
                                class="attachment-remove tap"
                                ?hidden=${!this._editing}
                                @click=${() => this._deleteAttachment(a)}
                            ></pl-icon>
                            <div class="attachment-body">
                                <div class="attachment-name ellipsis">${a.name}</div>
                                <div class="attachment-size">${fileSize(a.size)}</div>
                            </div>
                        </div>
                    `
                )}

                <div class="actions" ?hidden=${!this._editing}>
                    <button class="icon tap" @click=${() => this._addField()}>
                        <pl-icon icon="add"></pl-icon>
                        <div>${$l("Field")}</div>
                    </button>

                    <button class="icon tap" @click=${this.addAttachment}>
                        <pl-icon icon="attachment"></pl-icon>
                        <div>${$l("Attachment")}</div>
                    </button>

                    <button class="icon tap" @click=${this._move}>
                        <pl-icon icon="share"></pl-icon>
                        <div>${$l("Move")}</div>
                    </button>

                    <button class="icon tap negative" @click=${this._deleteItem}>
                        <pl-icon icon="delete"></pl-icon>
                        <div>${$l("Delete")}</div>
                    </button>
                </div>

                <div class="updated">
                    ${until(formatDateFromNow(updated!))}
                    ${updatedByMember && " " + $l("by {0}", updatedByMember.email)}
                </div>
            </div>

            <div class="fabs" ?hidden=${this._editing}>
                <div class="flex"></div>

                <pl-icon icon="edit" class="tap fab" @click=${() => this.edit()} ?disabled=${readonly}> </pl-icon>
            </div>

            <div class="fabs" ?hidden=${!this._editing}>
                <button class="primary icon fab tap save-button" @click=${this.save}>
                    <pl-icon icon="check"></pl-icon>
                    <div>${$l("Save")}</div>
                </button>

                <div class="spacer"></div>

                <button class="icon fab tap cancel-button" @click=${this.cancelEdit}>
                    <pl-icon icon="cancel"></pl-icon>
                    <div>${$l("Cancel")}</div>
                </button>
            </div>

            <input type="file" hidden @change=${this._attachFile} />
        `;
    }

    async edit() {
        if (!app.hasWritePermissions(this._vault!)) {
            return;
        }
        this._editing = true;
        await this.updateComplete;
        this._nameInput.focus();
    }

    async cancelEdit() {
        this._fields = this._getFields();
        await this.updateComplete;
        this._editing = false;
        this._itemChanged();
    }

    save() {
        app.updateItem(this._vault!, this._item!, {
            name: this._nameInput.value,
            fields: this._getFields(),
            tags: this._tagsInput.tags
        });
        this._editing = false;
        this._itemChanged();
    }

    private _getFields() {
        return [...this._fieldInputs].map((fieldEl: FieldElement) => {
            return {
                name: fieldEl.name,
                value: fieldEl.value,
                type: fieldEl.type
            };
        });
    }

    private _itemChanged() {
        const item = this._item!;
        this._nameInput.value = item.name;
        this._fields = item.fields.map(f => ({ ...f }));
        this._tagsInput.tags = [...item.tags];
    }

    private _removeField(index: number) {
        this._fields = this._fields.filter((_, i) => i !== index);
    }

    private async _deleteItem() {
        this.open = false;
        const confirmed = await confirm($l("Are you sure you want to delete this item?"), $l("Delete"), $l("Cancel"), {
            type: "destructive"
        });
        if (confirmed) {
            app.deleteItems([{ vault: this._vault!, item: this._item! }]);
            router.go("items");
        } else {
            this.open = true;
        }
    }

    private async _addField() {
        this.open = false;
        const fieldType = await this._fieldTypeDialog.show();
        this.open = true;

        if (!fieldType) {
            return;
        }

        this._fields.push({ name: "", value: "", type: fieldType });
        this.requestUpdate();
        await this.updateComplete;
        setTimeout(() => this._fieldInputs[this._fields.length - 1].focus(), 100);
    }

    private async _move() {
        if (!app.hasWritePermissions(this._vault!)) {
            return;
        }
        this.open = false;
        if (this._item!.attachments.length) {
            await alert($l("Items with attachments cannot be moved!"), { type: "warning" });
        } else {
            const movedItems = await this._moveItemsDialog.show([{ item: this._item!, vault: this._vault! }]);
            if (movedItems && movedItems.length) {
                router.go(`items/${movedItems[0].id}`);
            }
        }
        this.open = true;
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
        this.open = false;
        const value = await this._generator.show();
        this.open = true;
        if (value) {
            this._fields[index].value = value;
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
                type: "warning"
            });
            return;
        }

        this.open = false;
        const att = await this._uploadDialog.show({ item: this.itemId, file });
        if (att) {
            await alert($l("File uploaded successfully!"), { type: "success" });
        }
        this.open = true;
    }

    private async _openAttachment(info: AttachmentInfo) {
        if (this._editing) {
            return;
        }
        this.open = false;
        await this._attachmentDialog.show({ item: this.itemId, info });
        this.open = true;
    }

    private async _getTotpQR(index: number): Promise<void> {
        this.open = false;
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
        this.open = true;
    }

    private _setFavorite(favorite: boolean) {
        app.updateItem(this._vault!, this._item!, { favorite });
        this.requestUpdate();
    }

    private async _deleteAttachment(a: AttachmentInfo) {
        this.open = false;
        const confirmed = await confirm(
            $l("Are you sure you want to delete this attachment?"),
            $l("Delete"),
            $l("Cancel"),
            {
                title: $l("Delete Attachment"),
                type: "destructive"
            }
        );
        this.open = true;
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

    private _dragstart(e: DragEvent, index: number) {
        // console.log("dragstart", e);
        this._draggingIndex = index;
        e.dataTransfer!.effectAllowed = "move";
        e.dataTransfer!.setData("text/plain", "foo");
        (e.target as HTMLElement).classList.add("dragging");
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
