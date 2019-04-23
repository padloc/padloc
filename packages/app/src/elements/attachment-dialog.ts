import { TemplateResult } from "lit-element";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { VaultItemID } from "@padloc/core/lib/item.js";
import { Attachment, AttachmentInfo } from "@padloc/core/lib/attachment.js";
import { app } from "../init.js";
import { mixins } from "../styles";
import { mediaType, fileIcon, fileSize } from "../util.js";
import { confirm } from "../dialog.js";
import { element, html, css, property } from "./base.js";
import { Dialog } from "./dialog.js";
import "./icon.js";

@element("pl-attachment-dialog")
export class AttachmentDialog extends Dialog<{ info?: AttachmentInfo; file?: File; item: VaultItemID }, void> {
    static styles = [
        ...Dialog.styles,
        css`
            .inner {
                background: none;
                box-shadow: none;
                border-radius: 0;
                ${mixins.fullbleed()}
                max-width: none;
                display: flex;
                flex-direction: column;
            }

            .scrim {
                background: var(--color-secondary);
            }

            :host([open]) .scrim {
                opacity: 1;
            }

            .header {
                padding: 12px;
                background: var(--color-tertiary);
                box-shadow: rgba(0, 0, 0, 0.15) 0px 1px 3px;
                position: relative;
                z-index: 1;
            }

            .header > .name {
                font-weight: bold;
                text-align: center;
            }

            .header > pl-icon {
                position: absolute;
                right: 4px;
                top: 0;
                bottom: 0;
                margin: auto;
            }

            .info,
            .preview {
                flex: 1;
                position: relative;
            }

            .preview.image {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 8px;
            }

            .preview.image img {
                width: 100%;
                height: 100%;
                object-fit: scale-down;
            }

            .preview.text,
            .preview.code {
                margin: 0;
                background: var(--color-quaternary);
                font-size: var(--font-size-tiny);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .preview code {
                padding: 16px;
                padding-bottom: 80px;
                max-width: 100%;
                max-height: 100%;
                box-sizing: border-box;
                ${mixins.scroll()}
            }

            .preview.text {
                white-space: normal;
            }

            .preview.text code {
                max-width: 600px;
            }

            .info {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: var(--color-tertiary);
            }

            .info > pl-icon {
                width: 100px;
                height: 100px;
                font-size: 80px;
            }

            .controls {
                display: flex;
                align-items: center;
                padding: 12px;
                background: var(--color-tertiarty);
                border-radius: var(--border-radius);
            }

            .mime-type {
                font-weight: bold;
                margin-top: 8px;
            }

            .error {
                font-size: var(--font-size-small);
                margin-bottom: 12px;
                color: var(--color-negative);
                font-weight: bold;
            }

            .size {
                font-size: var(--font-size-small);
                margin-bottom: 12px;
            }
        `
    ];

    @property()
    info: AttachmentInfo | null = null;

    @property()
    itemId: VaultItemID | null = null;

    readonly preventDismiss = true;

    @property()
    private _progress: { loaded: number; total: number } | null = null;

    @property()
    private _error = "";

    @property()
    private _objectUrl?: string;

    @property()
    private _preview: TemplateResult | null = null;

    get _item() {
        const found = (this.itemId && app.getItem(this.itemId)) || null;
        return found && found.item;
    }

    get _vault() {
        const found = (this.itemId && app.getItem(this.itemId)) || null;
        return found && found.vault;
    }

    show({ info, item }: { info: AttachmentInfo; item: VaultItemID }) {
        this.info = info;
        this.itemId = item;
        this._error = "";
        this._progress = null;
        this._preview = null;
        this._download();
        return super.show();
    }

    done() {
        if (this._objectUrl) {
            URL.revokeObjectURL(this._objectUrl);
        }
        this._objectUrl = undefined;
        this._preview = null;
        super.done();
    }

    private async _delete() {
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
        if (confirmed) {
            await app.deleteAttachment(this.itemId!, this.info!);
            this.done();
        } else {
            this.open = true;
        }
    }

    async _download() {
        this._progress = null;
        this._error = "";

        const att = await app.downloadAttachment(this.info!);
        const download = att.downloadProgress!;
        const handler = () => (this._progress = download.progress);

        download.addEventListener("progress", handler);
        try {
            await download.completed;
        } catch (e) {}
        download.removeEventListener("progress", handler);

        this._progress = null;

        if (download.error) {
            this._error = $l("Download failed!");
        } else {
            this._preview = await this._getPreview(att);
        }
    }

    private async _getPreview(att: Attachment) {
        if (!this.info) {
            return null;
        }

        const mType = mediaType(this.info.type);

        switch (mType) {
            case "pdf":
                this._objectUrl = await att.toObjectURL();
                return html`
                    <object
                        class="preview pdf"
                        type="application/pdf"
                        data="${this._objectUrl}#toolbar=0&view=Fit"
                    ></object>
                `;
            case "image":
                this._objectUrl = await att.toObjectURL();
                return html`
                    <div class="preview image">
                        <img src="${this._objectUrl}" />
                    </div>
                `;
            case "text":
            case "code":
                const text = await att.toText();
                return html`<pre class="preview ${mType}"><code>${text}</pre></code>`;
            default:
                return null;
        }
    }

    renderContent() {
        if (!this.info) {
            return html``;
        }

        return html`
            <div class="header">
                <div class="name">${this.info.name}</div>
                <pl-icon icon="close" class="tap" @click=${() => this.done()}></pl-icon>
            </div>

            ${this._preview ||
                html`
                    <div class="info">
                        <pl-spinner
                            class="loading-spinner"
                            .active=${!!this._progress}
                            ?hidden=${!this._progress}
                        ></pl-spinner>
                        <pl-icon .icon=${fileIcon(this.info.type)} ?hidden=${!!this._progress}></pl-icon>

                        <div class="mime-type ellipis">${this.info.type}</div>

                        <div class="error" ?hidden=${!this._error}>${this._error}</div>

                        <div class="size" ?hidden=${!!this._error}>
                            ${this._progress
                                ? $l(
                                      "downloading... {0}/{1}",
                                      fileSize(this._progress.loaded),
                                      fileSize(this._progress.total)
                                  )
                                : fileSize(this.info.size)}
                        </div>
                    </div>
                `}

            <div class="fabs">
                <pl-icon icon="delete" class="fab tap destructive" @click=${this._delete}></pl-icon>
                <div class="flex"></div>
                <pl-icon icon="edit" class="fab light tap"></pl-icon>
                <pl-icon icon="download" class="fab light tap"></pl-icon>
            </div>
        `;
    }
}
