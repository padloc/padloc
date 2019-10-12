import { translate as $l } from "@padloc/locale/src/translate";
import { VaultItemID } from "@padloc/core/src/item";
import { Attachment } from "@padloc/core/src/attachment";
import { ErrorCode } from "@padloc/core/src/error";
import { app } from "../globals";
import { fileIcon, fileSize } from "../lib/util";
import { element, html, css, property, query } from "./base";
import { Dialog } from "./dialog";
import "./icon";
import { LoadingButton } from "./loading-button";
import { Input } from "./input";

@element("pl-upload-dialog")
export class UploadDialog extends Dialog<{ file: File; item: VaultItemID }, Attachment> {
    static styles = [
        ...Dialog.styles,
        css`
            h1 {
                margin: 0 0 8px 0;
            }

            .file-info {
                display: flex;
                margin: 12px 0;
                align-items: center;
            }

            .file-info pl-icon {
                width: 80px;
                height: 80px;
                font-size: 60px;
                margin: 4px;
            }

            .name {
                font-weight: bold;
                height: auto;
                padding: 8px 12px;
                margin-right: 12px;
                margin-left: -6px;
            }

            .size,
            .error {
                margin-top: 8px;
                font-weight: bold;
                font-size: var(--font-size-small);
            }

            .error {
                color: var(--color-negative);
            }
        `
    ];

    @property()
    file: File | null = null;

    @property()
    itemId: VaultItemID | null = null;

    readonly preventDismiss = true;

    @property()
    private _progress: { loaded: number; total: number } | null = null;

    @property()
    private _error = "";

    @query("#nameInput")
    private _nameInput: Input;

    @query("#uploadButton")
    private _uploadButton: LoadingButton;

    get _item() {
        const found = (this.itemId && app.getItem(this.itemId)) || null;
        return found && found.item;
    }

    get _vault() {
        const found = (this.itemId && app.getItem(this.itemId)) || null;
        return found && found.vault;
    }

    show({ item, file }: { file: File; item: VaultItemID }) {
        this._error = "";
        this._progress = null;
        this.file = file;
        this.itemId = item;
        return super.show();
    }

    async upload() {
        if (this._uploadButton.state === "loading") {
            return;
        }

        this._progress = null;
        this._error = "";

        if (!this._nameInput.value) {
            this._error = $l("Please enter a name!");
            return;
        }

        this._uploadButton.start();

        const att = await app.createAttachment(this.itemId!, this.file!, this._nameInput.value);

        const upload = att.uploadProgress!;

        const handler = () => (this._progress = upload.progress);

        upload.addEventListener("progress", handler);
        try {
            await upload.completed;
        } catch (e) {}
        upload.removeEventListener("progress", handler);

        this._progress = null;

        if (upload.error) {
            this._uploadButton.fail();
            this._error =
                upload.error.code === ErrorCode.STORAGE_QUOTA_EXCEEDED
                    ? $l("Storage limit exceeded!")
                    : $l("Upload failed! Please try again!");
        } else {
            this._uploadButton.success();
            this.done(att);
        }
    }

    renderContent() {
        if (!this.file) {
            return html``;
        }

        return html`
            <div class="file-info">
                <pl-icon .icon=${fileIcon(this.file.type)}></pl-icon>

                <div class="flex">
                    <h1>${$l("Upload Attachment")}</h1>

                    <pl-input class="name" id="nameInput" .value=${this.file.name}></pl-input>

                    <div class="size">
                        ${this._progress
                            ? $l(
                                  "uploading... {0}/{1}",
                                  fileSize(this._progress.loaded),
                                  fileSize(this._progress.total)
                              )
                            : (this.file.type || $l("Unkown File Type")) + " - " + fileSize(this.file.size)}
                    </div>

                    <div class="error" ?hidden=${!this._error}>${this._error}</div>
                </div>
            </div>

            <div class="actions">
                <pl-loading-button id="uploadButton" class="primary tap" @click="${this.upload}}">
                    <div>${this._error ? $l("Retry Upload") : $l("Upload")}</div>
                </pl-loading-button>

                <button class="tap" @click=${() => this.done()} ?disabled=${!!this._progress}>${$l("Cancel")}</button>
            </div>
        `;
    }
}
