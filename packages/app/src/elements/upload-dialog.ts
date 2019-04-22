import { localize as $l } from "@padloc/core/lib/locale.js";
import { wait } from "@padloc/core/lib/util.js";
import { VaultItemID } from "@padloc/core/lib/item.js";
import { RequestProgress } from "@padloc/core/lib/transport.js";
import { Attachment, AttachmentInfo } from "@padloc/core/lib/attachment.js";
import { ErrorCode } from "@padloc/core/lib/error.js";
import { app } from "../init.js";
import { fileIcon, fileSize } from "../util.js";
import { element, html, css, property, query, observe } from "./base.js";
import { Dialog } from "./dialog.js";
import "./icon.js";
import { LoadingButton } from "./loading-button.js";

@element("pl-upload-dialog")
export class UploadDialog extends Dialog<{ file: File; item: VaultItemID }, Attachment> {
    static styles = [
        ...Dialog.styles,
        css`
            .file-info {
                display: flex;
                margin: 8px 0;
                align-items: center;
            }

            .file-info pl-icon {
                width: 80px;
                height: 80px;
                font-size: 60px;
            }

            .name {
                font-weight: bold;
            }

            .size,
            .error {
                font-size: var(--font-size-small);
            }

            .error {
                color: var(--color-negative);
                font-weight: bold;
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

        this._uploadButton.start();

        const att = await app.createAttachment(this.itemId!, this.file!);

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
                    ? $l("You have exceed the storage limit for this vault!")
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
                    <div class="name">${this.file.name}</div>
                    <div class="size">
                        ${this._progress
                            ? $l(
                                  "uploading... {0}/{1}",
                                  fileSize(this._progress.loaded),
                                  fileSize(this._progress.total)
                              )
                            : fileSize(this.file.size)}
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
