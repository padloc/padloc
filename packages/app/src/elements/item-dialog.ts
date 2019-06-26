import { until } from "lit-html/directives/until.js";
import { VaultItemID, Field } from "@padloc/core/lib/item.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { AttachmentInfo } from "@padloc/core/lib/attachment.js";
import { parseURL } from "@padloc/core/lib/otp.js";
import { formatDateFromNow, fileIcon, fileSize } from "../util.js";
import { mixins } from "../styles";
import { alert, confirm, dialog } from "../dialog.js";
import { app, router } from "../init.js";
import { setClipboard } from "../clipboard.js";
import { element, html, css, property, query, queryAll } from "./base.js";
import { Dialog } from "./dialog.js";
import "./icon.js";
import { Input } from "./input.js";
import { TagsInput } from "./tags-input.js";
import { MoveItemsDialog } from "./move-items-dialog.js";
import { FieldElement } from "./field.js";
import "./field.js";
import { Generator } from "./generator.js";
import { AttachmentDialog } from "./attachment-dialog.js";
import { UploadDialog } from "./upload-dialog.js";
import { QRDialog } from "./qr-dialog.js";

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

    async show(itemId: string) {
        this._editing = false;
        this.itemId = itemId;
        await this.updateComplete;
        this._itemChanged();
        return super.show();
    }

    static styles = [
        ...Dialog.styles,
        css`
            :host {
                ${mixins.scroll()}
            }

            .inner {
                max-width: 400px;
                background: var(--color-quaternary);
            }

            header {
                display: block;
            }

            .header-inner {
                display: flex;
            }

            .name {
                padding: 0 10px;
                line-height: 40px;
            }

            pl-tags-input {
                margin: 5px 5px -5px 5px;
            }

            :host(:not([editing])) pl-field:hover {
                background: #eee;
            }

            .add-button {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 6px;
            }

            .add-button pl-icon {
                width: 30px;
                position: relative;
                top: 1px;
            }

            .updated {
                text-align: center;
                font-size: var(--font-size-tiny);
                color: #888;
                background: rgba(255, 255, 255, 0.5);
                position: absolute;
                left: 10px;
                bottom: 10px;
            }

            .updated::before {
                font-family: FontAwesome;
                font-size: 80%;
                content: "\\f303\ ";
            }

            .fabs {
                position: static;
            }

            .attachment {
                display: flex;
                align-items: center;
                padding: 8px;
            }

            .attachment-body {
                flex: 1;
                width: 0;
            }

            .attachment pl-icon {
                font-size: 150%;
                width: 30px;
                margin: 0 8px 0 2px;
            }

            .attachment-name {
                font-size: var(--font-size-small);
                font-weight: bold;
            }

            .attachment-size {
                font-size: var(--font-size-tiny);
            }

            .favorite {
                color: var(--color-secondary);
                width: 40px;
                height: 40px;
                font-size: var(--font-size-default);
                opacity: 0.3;
                cursor: pointer;
                transition: transform 0.2s cubic-bezier(0.05, 0.7, 0.03, 2) 0s;
            }

            .favorite:hover {
                opacity: 0.6;
            }

            .favorite[active] {
                color: var(--color-negative);
                opacity: 1;
                transform: scale(1.1);
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
                <div class="header-inner">
                    <pl-input
                        id="nameInput"
                        class="name flex"
                        .placeholder=${$l("Enter Item Name")}
                        ?readonly=${!this._editing}
                    >
                    </pl-input>
                    <pl-icon icon="cancel" class="tap" @click=${this.dismiss} hidden></pl-icon>
                    <pl-icon
                        icon="favorite"
                        class="favorite"
                        ?active=${isFavorite}
                        @click=${() => this._setFavorite(!isFavorite)}
                    ></pl-icon>
                </div>

                <pl-tags-input .editing=${this._editing} .vault=${this._vault} @move=${this._move}></pl-tags-input>
            </header>

            <div class="fields">
                ${this._fields.map(
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
                        >
                        </pl-field>
                    `
                )}

                <div class="add-button tap item" ?hidden=${!this._editing} @click=${() => this._addField()}>
                    <pl-icon icon="add"></pl-icon>
                    <div>${$l("Add Field")}</div>
                </div>
            </div>

            <div class="attachments" ?hidden=${this._editing || !attachments.length}>
                ${attachments.map(
                    a => html`
                        <div class="attachment item tap" @click=${() => this._openAttachment(a)}>
                            <pl-icon icon=${fileIcon(a.type)}></pl-icon>
                            <div class="attachment-body">
                                <div class="attachment-name ellipsis">${a.name}</div>
                                <div class="attachment-size">${fileSize(a.size)}</div>
                            </div>
                        </div>
                    `
                )}
            </div>

            <div class="updated" hidden>
                ${until(formatDateFromNow(updated!))} ${updatedByMember && " " + $l("by {0}", updatedByMember.email)}
            </div>

            <div class="actions" ?hidden=${!this._editing}>
                <button class="primary tap" @click=${this.save}>${$l("Save")}</button>

                <button class="tap" @click=${this.cancelEdit}>${$l("Cancel")}</button>
            </div>

            <div class="fabs" ?hidden=${this._editing}>
                <pl-icon
                    icon="delete"
                    class="destructive fab tap"
                    @click=${() => this._deleteItem()}
                    ?disabled=${readonly}
                >
                </pl-icon>

                <div class="flex"></div>

                <pl-icon icon="attachment" class="fab tap" @click=${() => this._addAttachment()} ?disabled=${readonly}>
                </pl-icon>

                <pl-icon icon="edit" class="tap fab" @click=${() => this.edit()} ?disabled=${readonly}> </pl-icon>
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

    private async _addField(field: Field = { name: "", value: "", type: "note" }) {
        this._fields.push(field);
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

    private _addAttachment() {
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
}
