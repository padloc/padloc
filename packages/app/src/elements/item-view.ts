import "./item-icon";
import "./popover";
import { until } from "lit/directives/until.js";
import { repeat } from "lit/directives/repeat.js";
import { VaultItemID, Field, FieldDef, FIELD_DEFS, VaultItem } from "@padloc/core/src/item";
import { translate as $l } from "@padloc/locale/src/translate";
import { AttachmentInfo } from "@padloc/core/src/attachment";
import { parseURL } from "@padloc/core/src/otp";
import { formatDateFromNow } from "../lib/util";
import { alert, confirm, dialog } from "../lib/dialog";
// import { animateCascade } from "../lib/animation";
import { app, router } from "../globals";
import { shared } from "../styles";
import { setClipboard } from "../lib/clipboard";
import { Routing } from "../mixins/routing";
import { StateMixin } from "../mixins/state";
import "./icon";
import { Input } from "./input";
import { TagsInput } from "./tags-input";
import { MoveItemsDialog } from "./move-items-dialog";
import { FieldElement } from "./field";
import "./field";
import { GeneratorDialog } from "./generator-dialog";
import { AttachmentDialog } from "./attachment-dialog";
import { UploadDialog } from "./upload-dialog";
import { QRDialog } from "./qr-dialog";
import "./scroller";
import "./button";
import "./list";
import "./attachment";
import { customElement, property, query, queryAll, state } from "lit/decorators.js";
import { css, html, LitElement } from "lit";

@customElement("pl-item-view")
export class ItemView extends Routing(StateMixin(LitElement)) {
    routePattern = /^items(?:\/([^\/]+)(?:\/([^\/]+))?)?/;

    @property()
    itemId: VaultItemID = "";

    @property({ type: Boolean })
    isNew: boolean = false;

    get hasChanges() {
        return this._editing;
    }

    private get _item() {
        const found = (this.itemId && app.getItem(this.itemId)) || null;
        return found && found.item;
    }

    private get _vault() {
        const found = (this.itemId && app.getItem(this.itemId)) || null;
        return found && found.vault;
    }

    private get _isEditable() {
        return this._vault && app.isEditable(this._vault);
    }

    @state()
    private _editing: boolean = false;

    @state()
    private _fields: Field[] = [];

    @state()
    private _isDraggingFileToAttach: boolean = false;

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

    @dialog("pl-generator-dialog")
    private _generatorDialog: GeneratorDialog;

    @dialog("pl-attachment-dialog")
    private _attachmentDialog: AttachmentDialog;

    @dialog("pl-upload-dialog")
    private _uploadDialog: UploadDialog;

    @dialog("pl-qr-dialog")
    private _qrDialog: QRDialog;

    // @dialog("pl-field-type-dialog")
    // private _fieldTypeDialog: FieldTypeDialog;

    // private _draggingIndex = -1;
    //
    // private _dragOverIndex = -1;

    async handleRoute([id, mode]: [string, string], { addattachment }: { [prop: string]: string }) {
        this.itemId = id;

        if (this.itemId && !this._item) {
            this.redirect("items");
        }

        this.isNew = mode === "new";

        if (["new", "edit"].includes(mode)) {
            if (!this._isEditable) {
                this.redirect(`items/${this.itemId}`);
                return;
            }
            this._editing = true;
            setTimeout(() => this._nameInput && this._nameInput.focus(), 500);
        } else {
            this._editing = false;
        }

        await this.updateComplete;
        this._itemChanged();

        if (addattachment === "true") {
            this.addAttachment();
            const { ...params } = router.params;
            delete params.addattachment;
            router.params = params;
        }

        await this.updateComplete;

        this._animateIn();

        const item = this._item;
        if (item) {
            app.updateLastUsed(item);
        }
    }

    async addAttachment() {
        await this.updateComplete;
        this._fileInput.click();
    }

    private _moveField(index: number, target: "up" | "down" | number) {
        const field = this._fields[index];
        this._fields.splice(index, 1);
        const targetIndex = target === "up" ? index - 1 : target === "down" ? index + 1 : target;
        this._fields.splice(targetIndex, 0, field);
        this.requestUpdate();
    }

    private _animateIn() {
        // return animateCascade(this.renderRoot.querySelectorAll(".animated"), {
        //     animation: "slideIn",
        //     fill: "both",
        //     fullDuration: 800,
        //     duration: 500,
        // });
    }

    private async _copyToClipboard(item: VaultItem, field: Field) {
        setClipboard(await field.transform(), `${item.name} / ${field.name}`);
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
                --input-padding: 0.3em 0.5em;
                font-weight: bold;
            }

            .back-button {
                margin-right: -0.5em;
                z-index: 1;
            }

            .favorite-button {
                --button-color: var(--color-shade-5);
                --button-toggled-background: transparent;
                --button-toggled-color: var(--color-favorite);
                --button-toggled-weight: var(--font-weight-bold);
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

            .fields,
            .attachments {
                margin: 0.5em 0;
            }

            .field-selector {
                max-height: calc(100vh - 5em);
                overflow: auto;
            }

            .tags-input {
                margin-left: 3.1em;
                margin-bottom: 0.5em;
            }

            @media (max-width: 700px) {
                .save-cancel {
                    padding-bottom: calc(var(--inset-bottom) + 0.5em);
                }
            }
        `,
    ];

    render() {
        if (app.state.locked || !this._item || !this._vault) {
            return html`
                <div class="fullbleed centering double-padded text-centering vertical layout subtle">
                    <pl-icon icon="note" class="enormous thin"></pl-icon>

                    <div>${$l("No item selected.")}</div>
                </div>
            `;
        }

        const { updated, updatedBy } = this._item!;
        const vault = this._vault!;
        const org = vault.org && app.getOrg(vault.org.id);
        const updatedByMember = org && org.getMember({ id: updatedBy });
        const attachments = this._item!.attachments || [];
        const isFavorite = app.account!.favorites.has(this.itemId);

        return html`
            <div
                class="fullbleed vertical layout"
                @drop=${this._handleDrop}
                @dragover=${this._handleDragOver}
                @dragleave=${this._handleDragLeave}
            >
                <header class="animated padded center-aligning horizontal layout">
                    <pl-button
                        class="transparent slim back-button"
                        @click=${() => router.go("items")}
                        ?hidden=${this._editing}
                    >
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>

                    <pl-input
                        id="nameInput"
                        class="large name-input ${!this._editing ? "transparent" : ""} stretch"
                        .placeholder=${$l("Enter Item Name")}
                        ?readonly=${!this._editing}
                        select-on-focus
                        required
                    >
                        <pl-item-icon
                            .item=${this._item}
                            slot="before"
                            style="margin-left: 0.3em"
                            class="wide-only"
                        ></pl-item-icon>
                    </pl-input>

                    <div class="horizontal layout" ?hidden=${this._editing}>
                        <pl-button
                            @click=${() => this._setFavorite(!isFavorite)}
                            class="slim transparent favorite-button"
                            .label=${$l("Favorite")}
                            .toggled=${isFavorite}
                        >
                            <pl-icon icon="favorite"></pl-icon>
                        </pl-button>

                        <pl-button
                            class="slim transparent"
                            @click=${() => this.edit()}
                            ?disabled=${!this._isEditable}
                            .label=${$l("Edit")}
                        >
                            <pl-icon icon="edit"></pl-icon>
                        </pl-button>
                    </div>

                    <div class="horizontal layout left-margined" ?hidden=${!this._editing}>
                        <pl-button .label=${$l("Field")} class="slim transparent">
                            <pl-icon icon="add"></pl-icon>
                        </pl-button>

                        <pl-popover hide-on-click alignment="bottom-left">
                            <div class="field-selector">
                                <pl-list>
                                    ${[...Object.values(FIELD_DEFS)].map(
                                        (fieldDef) => html`
                                            <div
                                                class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                                                @click=${() => this._addField(fieldDef)}
                                            >
                                                <pl-icon icon="${fieldDef.icon}"></pl-icon>
                                                <div class="ellipsis">${fieldDef.name}</div>
                                            </div>
                                        `
                                    )}
                                    <div
                                        class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                                        @click=${() => this.addAttachment()}
                                    >
                                        <pl-icon icon="attachment"></pl-icon>
                                        <div class="ellipsis">Attachment</div>
                                    </div>
                                </pl-list>
                            </div>
                        </pl-popover>

                        <pl-button .label=${$l("More Options")} class="slim transparent" ?hidden=${this.isNew}>
                            <pl-icon icon="more"></pl-icon>
                        </pl-button>

                        <pl-popover hide-on-click hide-on-leave alignment="bottom-left">
                            <pl-list>
                                <div
                                    class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                                    @click=${this._move}
                                >
                                    <pl-icon icon="share"></pl-icon>
                                    <div class="ellipsis">${$l("Move To Vault ...")}</div>
                                </div>
                                <div
                                    class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                                    @click=${this._deleteItem}
                                >
                                    <pl-icon icon="delete"></pl-icon>
                                    <div class="ellipsis">${$l("Delete Item")}</div>
                                </div>
                            </pl-list>
                        </pl-popover>
                    </div>
                </header>

                <pl-scroller class="stretch">
                    <div class="vertical layout fill-vertically content">
                        <pl-tags-input
                            .editing=${this._editing}
                            .vault=${this._vault}
                            @move=${this._move}
                            class="animated small horizontally-double-margined horizontally-padded tags-input"
                        ></pl-tags-input>

                        <div class="fields border-top border-bottom">
                            <pl-list>
                                ${repeat(
                                    this._fields,
                                    (field) => `${this.itemId}_${field.name}_${field.type}`,
                                    (field: Field, index: number) => html`
                                        <pl-field
                                            class="animated padded list-item"
                                            .canMoveUp=${!!index}
                                            .canMoveDown=${index < this._fields.length - 1}
                                            .field=${field}
                                            .editing=${this._editing}
                                            .auditResults=${this._item?.auditResults.filter(
                                                (auditResult) => auditResult.fieldIndex === index
                                            ) || []}
                                            @copy-clipboard=${() => this._copyToClipboard(this._item!, field)}
                                            @remove=${() => this._removeField(index)}
                                            @generate=${() => this._generateValue(index)}
                                            @get-totp-qr=${() => this._getTotpQR(index)}
                                            @dragstart=${(e: DragEvent) => this._dragstart(e, index)}
                                            @drop=${(e: DragEvent) => this._drop(e)}
                                            @moveup=${() => this._moveField(index, "up")}
                                            @movedown=${() => this._moveField(index, "down")}
                                        >
                                        </pl-field>
                                    `
                                )}
                            </pl-list>
                        </div>

                        <div class="attachments">
                            <h2
                                class="horizontally-double-margined bottom-margined animated section-header"
                                style="margin-left: 2.2em;"
                            >
                                ${$l("Attachments")}
                            </h2>

                            <pl-list class="border-top block" ?hidden=${!attachments.length}>
                                ${attachments.map(
                                    (a) => html`
                                        <pl-attachment
                                            .info=${a}
                                            .editing=${this._editing}
                                            class="animated ${this._editing ? "" : "hover click"} list-item"
                                            @click=${() => this._openAttachment(a)}
                                            @delete=${() => this._deleteAttachment(a)}
                                        >
                                        </pl-attachment>
                                    `
                                )}
                            </pl-list>

                            <div
                                class="double-padded text-centering border-top border-bottom hover click"
                                @click=${() => this.addAttachment()}
                            >
                                <span class="small ${this._isDraggingFileToAttach ? "highlighted bold" : "subtle"}">
                                    <pl-icon class="inline" icon="attachment"></pl-icon> ${$l(
                                        "Click or drag files here to add an attachment!"
                                    )}
                                </span>
                            </div>
                        </div>

                        <div class="stretch"></div>

                        <div class="animated double-margined spacing faded tiny centering horizontal layout">
                            <pl-icon icon="edit"></pl-icon>
                            <div>
                                ${until(formatDateFromNow(updated!))}
                                ${updatedByMember && " " + $l("by {0}", updatedByMember.email)}
                            </div>
                        </div>
                    </div>
                </pl-scroller>

                <div
                    class="animated padded spacing evenly stretching horizontal layout save-cancel"
                    ?hidden=${!this._editing}
                >
                    <pl-button class="primary spacing horizontal layout" @click=${this.save}>
                        <pl-icon icon="check"></pl-icon>
                        <div>${$l("Save")}</div>
                    </pl-button>

                    <pl-button class="spacing horizontal layout" @click=${this.cancelEditing}>
                        <pl-icon icon="cancel"></pl-icon>
                        <div>${$l("Cancel")}</div>
                    </pl-button>
                </div>

                <input type="file" hidden @change=${this._attachFile} />
            </div>
        `;
    }

    async edit() {
        this.go(`items/${this.itemId}/edit`);
    }

    async cancelEditing() {
        this.clearChanges();

        if (this.isNew) {
            this.go("items", undefined, undefined, true);
        } else {
            this.go(`items/${this.itemId}`, undefined, undefined, true);
        }
    }

    async clearChanges() {
        if (this.isNew) {
            app.deleteItems([this._item!]);
        } else {
            this._itemChanged();
        }
    }

    save() {
        if (!this._nameInput.reportValidity()) {
            return;
        }
        app.updateItem(this._item!, {
            name: this._nameInput.value,
            fields: [...this._fieldInputs].map((fieldEl: FieldElement) => fieldEl.field),
            tags: this._tagsInput.tags,
        });
        this.go(`items/${this.itemId}`, undefined, undefined, true);
    }

    private async _itemChanged() {
        if (!this._nameInput) {
            await this.updateComplete;
        }
        if (this._item) {
            this._nameInput.value = this._item.name;
            this._fields = this._item.fields.map((f) => new Field({ ...f }));
            this._tagsInput.tags = [...this._item.tags];
        } else {
            this._nameInput && (this._nameInput.value = "");
            this._fields = [];
            this._tagsInput && (this._tagsInput.tags = []);
        }
    }

    private async _removeField(index: number) {
        if (
            await confirm($l("Are you sure you want to remove this field?"), $l("Remove"), $l("Cancel"), {
                title: $l("Remove Field"),
                type: "destructive",
            })
        ) {
            this._fields = this._fields.filter((_, i) => i !== index);
        }
    }

    private async _deleteItem() {
        const confirmed = await confirm($l("Are you sure you want to delete this item?"), $l("Delete"), $l("Cancel"), {
            title: $l("Delete Vault Item"),
            type: "destructive",
        });
        if (confirmed) {
            app.deleteItems([this._item!]);
            this._editing = false;
            router.go("items");
        }
    }

    private async _addField(fieldDef: FieldDef) {
        // const fieldDef = await this._fieldTypeDialog.show();
        //
        // if (!fieldDef) {
        //     return;
        // }

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
                this.go(`items/${movedItems[0].id}`, undefined, true, true);
            }
        }
    }

    private async _generateValue(index: number) {
        const value = await this._generatorDialog.show();
        if (value) {
            this._fields[index] = new Field({ ...this._fields[index], value });
            this.requestUpdate();
        }
    }

    private async _addFileAttachment(file: File) {
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

    private async _attachFile() {
        const file = this._fileInput.files![0];
        this._fileInput.value = "";
        this._addFileAttachment(file);
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
                this._fields[index] = new Field({ ...this._fields[index], value: secret });
                this.requestUpdate();
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

    private async _handleDrop(event: DragEvent) {
        event.preventDefault();

        this._isDraggingFileToAttach = true;

        if (event.dataTransfer?.items) {
            for (const transferItem of event.dataTransfer.items) {
                // Only handle files
                if (transferItem.kind === "file") {
                    const transferFile = transferItem.getAsFile();
                    if (transferFile) {
                        await this._addFileAttachment(transferFile);
                    }
                }
            }
        } else if (event.dataTransfer?.files) {
            for (const transferFile of event.dataTransfer.files) {
                await this._addFileAttachment(transferFile);
            }
        }

        this._isDraggingFileToAttach = false;
    }

    private async _handleDragOver(event: DragEvent) {
        event.preventDefault();
        this._isDraggingFileToAttach = true;
    }

    private async _handleDragLeave(event: DragEvent) {
        event.preventDefault();
        this._isDraggingFileToAttach = false;
    }

    private _drop(e: DragEvent) {
        // console.log("drop", e, this._draggingIndex, this._dragOverIndex);
        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    private async _dragstart(event: DragEvent, index: number) {
        // console.log("dragstart", event);
        // this._draggingIndex = index;
        this.dispatchEvent(
            new CustomEvent("field-dragged", {
                detail: { item: this._item, index, event },
                bubbles: true,
                composed: true,
            })
        );
        (event.target as HTMLElement).classList.add("dragging");
        this.classList.add("dragging");
    }

    // private _dragenter(e: DragEvent, index: number) {
    //     // console.log("dragenter", e);
    //     e.dataTransfer!.dropEffect = "move";
    //
    //     this._dragOverIndex = index;
    //
    //     for (const [i, field] of this._fieldInputs.entries()) {
    //         field.classList.toggle(
    //             "dragover",
    //             i === index && i !== this._draggingIndex && i !== this._draggingIndex - 1
    //         );
    //     }
    // }
    //
    // private _dragover(e: DragEvent) {
    //     e.preventDefault();
    // }
    //
    // private _dragend(_e: DragEvent) {
    //     // console.log("dragend", e, this._draggingIndex, this._dragOverIndex);
    //
    //     if (this._draggingIndex !== -1 || this._dragOverIndex !== -1) {
    //         const field = this._fields[this._draggingIndex];
    //         this._fields.splice(this._draggingIndex, 1);
    //         const targetIndex =
    //             this._dragOverIndex >= this._draggingIndex ? this._dragOverIndex : this._dragOverIndex + 1;
    //         this._fields.splice(targetIndex, 0, field);
    //         this.requestUpdate();
    //     }
    //
    //     for (const field of this._fieldInputs) {
    //         field.classList.remove("dragging");
    //         field.classList.remove("dragover");
    //     }
    //     this.classList.remove("dragging");
    //     this._dragOverIndex = -1;
    //     this._draggingIndex = -1;
    // }
}
