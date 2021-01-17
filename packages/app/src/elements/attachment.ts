import { AttachmentInfo } from "@padloc/core/src/attachment";
import { translate as $l } from "@padloc/locale/src/translate";
import { fileIcon, fileSize } from "../lib/util";
import { shared } from "../styles";
import { BaseElement, element, html, property, query, css } from "./base";
import "./button";
import { Input } from "./input";
import "./icon";
// import { Drawer } from "./drawer";

@element("pl-attachment")
export class AttachmentElement extends BaseElement {
    @property()
    info: AttachmentInfo;

    @property()
    editing = false;

    get attachmentName() {
        return this._nameInput.value;
    }

    @query("#nameInput")
    private _nameInput: Input;

    // @query("pl-drawer")
    // private _drawer: Drawer;
    //
    // @listen("mouseenter", this)
    // protected _mouseenter() {
    //     this._drawer.collapsed = this.editing;
    // }
    //
    // @listen("mouseleave", this)
    // protected _mouseleave() {
    //     this._drawer.collapsed = true;
    // }

    static styles = [
        shared,
        css`
            :host {
                display: block;
                position: relative;
                padding: var(--spacing);
            }

            .attachment-header {
                color: var(--color-highlight);
                --input-padding: 0.3em;
                margin: 0.2em 0;
                font-weight: 600;
            }

            .actions {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(5em, 1fr));
            }

            .info {
                margin: -0.2em 0.4em 0.4em;
            }
        `,
    ];

    render() {
        return html`
            <div class="horizontal center-aligning layout">
                <pl-button class="slim transparent" ?hidden=${!this.editing} @click=${() => this.dispatch("delete")}>
                    <pl-icon icon="remove"></pl-icon>
                </pl-button>

                <div class="stretch collapse half-margined">
                    <div class="attachment-header">
                        <pl-input
                            class="dashed transparent small name-input"
                            placeholder="${this.editing ? $l("Enter Attachment Name") : $l("Unnamed")}"
                            .value=${this.info.name}
                            @input=${() => (this.info.name = this._nameInput.value)}
                            readonly
                        >
                            <div class="spacer" slot="before"></div>
                            <pl-icon icon="${fileIcon(this.info.type)}" class="tiny" slot="before"></pl-icon>
                        </pl-input>
                    </div>
                    <div class="info mono vertically-margined">
                        <strong>${this.info.type}</strong> - ${fileSize(this.info.size)}
                    </div>
                </div>
            </div>

            <pl-drawer hidden>
                <div class="actions">
                    <pl-button class="transparent slim" @click=${() => this.dispatch("open")}>
                        <pl-icon icon="show" class="right-margined"></pl-icon>
                        <div>${$l("View")}</div>
                    </pl-button>

                    <pl-button class="transparent slim" @click=${() => this.dispatch("download")}>
                        <pl-icon icon="download" class="right-margined"></pl-icon>
                        <div>${$l("Download")}</div>
                    </pl-button>
                </div>
            </pl-drawer>
        `;
    }
}
