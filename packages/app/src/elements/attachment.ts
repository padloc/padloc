import { AttachmentInfo } from "@padloc/core/lib/attachment.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { shared, mixins } from "../styles";
import { app } from "../init.js";
// import { dialog } from "../dialog.js";
import { BaseElement, element, html, property, query } from "./base.js";
import { LoadingButton } from "./loading-button.js";
import { Input } from "./input.js";
import "./icon.js";
// import { AttachmentDialog } from "./attachment-dialog.js";

@element("pl-attachment")
export class AttachmentElement extends BaseElement {
    @property()
    info: AttachmentInfo;

    @property()
    editing = false;

    get attachmentName() {
        return this._nameInput.value;
    }

    @query("#spinner")
    private _spinner: LoadingButton;

    @query("#nameInput")
    private _nameInput: Input;

    // @dialog("pl-attachment-dialog")
    // private _attachmentDialog: AttachmentDialog;

    shouldUpdate() {
        return !!this.info;
    }

    render() {
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
                
            </style>

            <div 
                class="tap display"
                ?hidden=${this.editing}
                @click=${this._openAttachment}>

                <pl-loading-button id="spinner">
                    
                    <pl-icon class="file-icon" icon=${this._icon()}></pl-icon>

                </pl-loading-button>

                <div class="flex">

                    <div class="name">${(this.info && this.info.name) || $l("Unnamed")}</div>

                    <div class="size">${this._size()}</div>

                </div>

            </div>

            <div class="edit" ?hidden=${!this.editing}>

                <pl-icon class="delete-icon tap" icon="remove" @click=${() => this.dispatch("delete")}></pl-icon>

                <pl-input id="nameInput" class="name-input" .value=${this.info && this.info.name}></pl-input>

            </pl-loading-button>
        `;
    }

    private async _openAttachment() {
        if (this._spinner.state === "loading") {
            return;
        }

        this._spinner.start();

        try {
            const attachment = await app.getAttachment(this.info);
            const url = await attachment.toObjectURL();
            const a = document.createElement("a");
            a.href = url;
            a.download = attachment.name;
            a.click();
            this._spinner.success();
            URL.revokeObjectURL(url);
        } catch (e) {
            this._spinner.fail();
            throw e;
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

    private _size() {
        const size = (this.info && this.info.size) || 0;
        return size < 1e6 ? Math.ceil(size / 10) / 100 + " KB" : Math.ceil(size / 10000) / 100 + " MB";
    }
}
