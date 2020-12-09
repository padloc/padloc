import { TemplateResult } from "lit-element";
import { translate as $l } from "@padloc/locale/src/translate";
import { VaultItemID } from "@padloc/core/src/item";
import { Attachment, AttachmentInfo } from "@padloc/core/src/attachment";
import { saveFile } from "@padloc/core/src/platform";
import { app } from "../globals";
import { mixins } from "../styles";
import { mediaType, fileIcon, fileSize } from "../lib/util";
import { confirm, prompt } from "../lib/dialog";
import { element, html, css, property } from "./base";
import { Dialog } from "./dialog";
import "./icon";
// import { View } from "./view";

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
            }

            :host([open]) .scrim {
                opacity: 1;
            }

            header {
                background: var(--color-background);
            }

            .preview.image img {
                width: 100%;
                height: 100%;
                object-fit: scale-down;
            }

            .preview.text,
            .preview.code {
                margin: 0;
                background: var(--color-background);
                font-size: var(--font-size-tiny);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .preview code {
                padding: 1em;
                padding-bottom: 3em;
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
        `,
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
    private _attachment: Attachment | null = null;

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
        this._attachment = null;
        this._download();
        return super.show();
    }

    done() {
        if (this._objectUrl) {
            URL.revokeObjectURL(this._objectUrl);
        }
        this._objectUrl = undefined;
        this._preview = null;
        this._attachment = null;
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
                type: "destructive",
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
            this._attachment = att;
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
                    <object class="content preview pdf" type="application/pdf" data="${this._objectUrl}"></object>
                `;
            case "image":
                this._objectUrl = await att.toObjectURL();
                return html`
                    <div class="content preview image">
                        <img src="${this._objectUrl}" />
                    </div>
                `;
            case "text":
            case "code":
                const text = await att.toText();
                return html`<pre class="content preview ${mType}"><code>${text}</pre></code>`;
            default:
                return null;
        }
    }

    private async _saveToDisk() {
        if (!this._attachment || !this.info) {
            throw "Need to download attachment first!";
        }

        this.open = false;
        const confirmed = await confirm(
            $l(
                "Do you want to save this file to your disk? WARNING: Doing " +
                    "this will leave the file exposed and unprotected on your " +
                    "harddrive!"
            ),
            $l("Save"),
            $l("Cancel"),
            { title: $l("Save To Disk"), type: "warning" }
        );
        this.open = true;

        if (confirmed) {
            saveFile(this.info.name, this.info.type, await this._attachment.getData());
        }
    }

    private async _edit() {
        if (!this.info) {
            return;
        }
        this.open = false;
        await prompt("", {
            title: $l("Edit Name"),
            confirmLabel: $l("Save"),
            value: this.info.name,
            label: $l("Attachment Name"),
            validate: async (name: string) => {
                if (!name) {
                    throw $l("Please enter an attachment name!");
                }
                if (name !== this.info!.name) {
                    this.info!.name = name;
                    await app.updateItem(this._item!, {});
                }
                return name;
            },
        });
        this.open = true;
    }

    renderContent() {
        if (!this.info) {
            return html``;
        }

        return html`
            <div class="fullbleed vertical layout">
                <header class="padded center-aligning horizontal layout">
                    <div class="stretch bold margined ellipsis">${this.info.name}</div>

                    <pl-button class="transparent round" @click=${this._edit}>
                        <pl-icon icon="edit"></pl-icon>
                    </pl-button>

                    <pl-button class="transparent round" @click=${this._delete}>
                        <pl-icon icon="delete"></pl-icon>
                    </pl-button>

                    <pl-button class="transparent round" ?disabled=${!this._attachment} @click=${this._saveToDisk}>
                        <pl-icon icon="download"></pl-icon>
                    </pl-button>

                    <pl-button class="transparent round" @click=${() => this.done()}>
                        <pl-icon icon="cancel"></pl-icon>
                    </pl-button>
                </header>

                ${this._preview ||
                html`
                    <div class="stretch">
                        <pl-spinner .active=${!!this._progress} ?hidden=${!this._progress}></pl-spinner>

                        <pl-icon .icon=${fileIcon(this.info.type)} ?hidden=${!!this._progress}></pl-icon>

                        <div class="mime-type ellipis">${this.info.type || $l("Unknown File Type")}</div>

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
            </div>
        `;
    }
}
