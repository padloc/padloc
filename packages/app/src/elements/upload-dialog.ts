import { translate as $l } from "@padloc/locale/src/translate";
import { VaultItemID } from "@padloc/core/src/item";
import { Attachment } from "@padloc/core/src/attachment";
import { ErrorCode } from "@padloc/core/src/error";
import { app } from "../globals";
import { fileIcon, fileSize } from "../lib/util";
import { Dialog } from "./dialog";
import "./icon";
import { Button } from "./button";
import { Input } from "./input";
import { customElement, property, query, state } from "lit/decorators";
import { css, html } from "lit";

@customElement("pl-upload-dialog")
export class UploadDialog extends Dialog<{ file: File; item: VaultItemID }, Attachment> {
    @property({ attribute: false })
    file: File | null = null;

    @property()
    itemId: VaultItemID | null = null;

    readonly preventDismiss = true;

    @state()
    private _progress: { loaded: number; total: number } | null = null;

    @property()
    private _error = "";

    @query("#nameInput")
    private _nameInput: Input;

    @query("#uploadButton")
    private _uploadButton: Button;

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

    static styles = [
        ...Dialog.styles,
        css`
            .inner {
                padding: 0.5em;
            }
        `,
    ];

    renderContent() {
        if (!this.file) {
            return html``;
        }

        return html`
            <div class="padded spaced horizontal layout">
                <pl-icon class="big" .icon=${fileIcon(this.file.type)}></pl-icon>

                <div class="spacer"></div>

                <div class="stretch spacing vertical layout">
                    <h1 class="big">${$l("Upload Attachment")}</h1>

                    <pl-input id="nameInput" .label=${$l("Attachment Name")} .value=${this.file.name}></pl-input>

                    <div>
                        ${this._progress
                            ? $l(
                                  "uploading... {0}/{1}",
                                  fileSize(this._progress.loaded),
                                  fileSize(this._progress.total)
                              )
                            : (this.file.type || $l("Unkown File Type")) + " - " + fileSize(this.file.size)}
                    </div>

                    <div class="red" ?hidden=${!this._error}>${this._error}</div>
                </div>
            </div>

            <div class="horizontal spacing evenly stretching center-aligning layout">
                <pl-button id="uploadButton" class="primary" @click="${this.upload}}">
                    ${this._error ? $l("Retry Upload") : $l("Upload")}
                </pl-button>

                <pl-button class="transparent" @click=${() => this.done()} ?disabled=${!!this._progress}>
                    ${$l("Cancel")}
                </pl-button>
            </div>
        `;
    }
}
