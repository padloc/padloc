import { Attachment, AttachmentInfo } from "@padloc/core/src/attachment";
import { translate as $l } from "@padloc/locale/src/translate";
import { RequestProgress } from "@padloc/core/src/transport";
import { shared, mixins } from "../styles";
// import { app } from "../init";
// import { dialog } from "../dialog";
import { BaseElement, element, html, property, query, observe } from "./base";
import "./loading-button";
import { Input } from "./input";
import "./icon";
// import { AttachmentDialog } from "./attachment-dialog";

@element("pl-attachment")
export class AttachmentElement extends BaseElement {
    @property()
    info: AttachmentInfo;

    @property()
    editing = false;

    get attachmentName() {
        return this._nameInput.value;
    }

    private get _attachment(): Attachment {
        // return app.getAttachment(this.info);
        return new Attachment();
    }

    @query("#nameInput")
    private _nameInput: Input;

    private _progressHandler = this.requestUpdate.bind(this, undefined, undefined);

    @property()
    private _upload?: RequestProgress;
    @property()
    private _download?: RequestProgress;

    shouldUpdate() {
        return !!this.info;
    }

    render() {
        const dlp = (this._download && this._download.downloadProgress) || {
            loaded: 0,
            total: 0
        };
        const ulp = (this._upload && this._upload.uploadProgress) || {
            loaded: 0,
            total: 0
        };

        const downloadError = this._download && this._download.error;
        const uploadError = this._upload && this._upload.error;

        const downloading = !!dlp.total && dlp.loaded < dlp.total && !downloadError;
        const uploading = !!ulp.total && ulp.loaded < ulp.total && !uploadError;

        return html`
            ${shared}

            <style>

                .display, .edit {
                    height: 50px;
                    border-radius: 8px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    position: relative;
                }

                #spinner {
                    width: 45px;
                }

                .file-icon {
                    font-size: 30px;
                }

                .display:hover {
                    background: #eee;
                }

                .name {
                    font-weight: bold;
                    font-size: var(--font-size-tiny);
                    align-self: stretch;
                    line-height: 16px;
                    ${mixins.ellipsis()}
                }

                .size {
                    font-size: var(--font-size-micro);
                }

                .name-input {
                    height: auto;
                    line-height: 30px;
                    font-size: var(--font-size-tiny);
                    box-sizing: border-box;
                    background: #fafafa;
                    border: solid 1px #eee;
                    border-radius: 8px;
                    padding: 0 5px;
                    flex: 1;
                }

                .progress {
                    height: 18px;
                    border-radius: 4px;
                    overflow: hidden;
                    position: relative;
                    margin-top: 2px;
                }

                .progress-bar {
                    ${mixins.fullbleed()}
                    background: var(--color-highlight);
                    transform-origin: 0 0;
                }

                .progress-text {
                    ${mixins.fullbleed()}
                    font-size: var(--font-size-micro);
                    font-weight: bold;
                    line-height: 18px;
                    z-index: 1;
                    padding: 0 4px;
                }

                .size.error {
                    color: var(--color-error);
                }

            </style>

            <div
                class="tap display"
                ?hidden=${this.editing && !uploading}
                ?disabled=${downloading || uploading}
                @click=${this._openAttachment}>

                <pl-loading-button id="spinner" .state=${uploading || downloading ? "loading" : "idle"}>

                    <pl-icon class="file-icon" icon=${this._icon()}></pl-icon>

                </pl-loading-button>

                <div class="flex">

                    <div class="name">${(this.info && this.info.name) || $l("Unnamed")}</div>

                    <div class="size" ?hidden=${uploadError || downloadError}>
                    ${
                        downloading
                            ? $l("downloading... {0}/{1}", this._size(dlp.loaded), this._size(dlp.total))
                            : uploading
                            ? $l("uploading... {0}/{1}", this._size(ulp.loaded), this._size(ulp.total))
                            : this._size(this.info.size)
                    }
                    </div>

                    <div class="size error" ?hidden=${!uploadError && !downloadError}>
                        ${uploadError ? $l("Failed to upload!") : $l("Failed to download! Click to try again.")}
                    </div>

                </div>

            </div>

            <div class="edit" ?hidden=${!this.editing || uploading}>

                <pl-icon class="delete-icon tap" icon="remove" @click=${() => this.dispatch("delete")}></pl-icon>

                <pl-input id="nameInput" class="name-input" .value=${this.info && this.info.name}>
                    <div class="upload-progress"></div>
                </pl-input>

            </pl-loading-button>
        `;
    }

    // private async _downloadAttachment() {
    //     const url = await this._attachment.toObjectURL();
    //     const a = document.createElement("a");
    //     a.href = url;
    //     a.download = this._attachment.name;
    //     a.click();
    //     URL.revokeObjectURL(url);
    // }

    private async _openAttachment() {
        if (!this._attachment.loaded) {
            // app.downloadAttachment(this._attachment).then(() => this._downloadAttachment());
            this._attachmentChanged();
        }
    }

    @observe("info")
    private async _attachmentChanged() {
        this._upload = this._attachment.uploadProgress;
        this._download = this._attachment.downloadProgress;
    }

    @observe("_upload")
    async _uploadChanged(changes: Map<string, any>) {
        const prev = changes.get("_upload");

        if (this._upload !== prev) {
            if (prev) {
                prev.removeEventListener("progress", this._progressHandler);
            }
            if (this._upload) {
                this._upload.addEventListener("progress", this._progressHandler);
            }
        }
    }

    @observe("_download")
    async _downloadChanged(changes: Map<string, any>) {
        const prev = changes.get("_download");

        if (this._download !== prev) {
            if (prev) {
                prev.removeEventListener("progress", this._progressHandler);
            }
            if (this._download) {
                this._download.addEventListener("progress", this._progressHandler);
            }
        }
    }

    private _icon() {
        const match = this.info && this.info.type && this.info.type.match(/(.*)\/(.*)/);
        const [, type, subtype] = match || ["", "", ""];

        switch (type) {
            case "video":
                return "file-video";
            case "audio":
                return "file-audio";
            case "image":
                return "file-image";
            case "text":
                switch (subtype) {
                    case "csv":
                    // return "file-csv";
                    case "plain":
                        return "file-text";
                    default:
                        return "file-code";
                }
            case "application":
                switch (subtype) {
                    case "pdf":
                        return "file-pdf";
                    case "json":
                        return "file-code";
                    case "zip":
                    case "x-7z-compressed":
                    case "x-freearc":
                    case "x-bzip":
                    case "x-bzip2":
                    case "java-archive":
                    case "x-rar-compressed":
                    case "x-tar":
                        return "file-archive";
                }

            default:
                return "file";
        }
    }

    private _size(size: number = 0) {
        return size < 1e6 ? Math.ceil(size / 10) / 100 + " KB" : Math.ceil(size / 10000) / 100 + " MB";
    }
}
