import { SharedStore } from "@padlock/core/lib/data.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { setClipboard } from "@padlock/core/lib/platform.js";
import sharedStyles from "../styles/shared.js";
import { router } from "../init.js";
import { BaseElement, element, html, property, query } from "./base.js";
import { Dialog } from "./dialog.js";
import { LoadingButton } from "./loading-button.js";

@element("pl-share-store-dialog")
export class ShareStoreDialog extends BaseElement {
    @property() store: SharedStore | null = null;

    @query("pl-dialog") private _dialog: Dialog;
    @query("#copyButton") private _copyButton: LoadingButton;

    private _resolve: (() => void) | null;
    private get _url() {
        return this.store && `${window.location.origin}${router.basePath}store/${this.store.id}`;
    }

    _shouldRender() {
        return !!this.store;
    }

    _render({ store }: this) {
        const { name } = store!;

        return html`
            <style>
                ${sharedStyles}

                .title {
                    padding: 10px 15px;
                    text-align: center;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(rgb(89, 198, 255) 0%, rgb(7, 124, 185) 100%);
                    text-shadow: rgba(0, 0, 0, 0.2) 0 2px 0;
                    color: var(--color-tertiary);
                    font-size: 110%;
                }

                pl-dialog > * {
                    --color-background: var(--color-tertiary);
                    --color-foreground: var(--color-secondary);
                    background: var(--color-background);
                    color: var(--color-foreground);
                    text-shadow: none;
                }

                pl-dialog > :not(:last-child):not(.title) {
                    border-bottom: solid 1px var(--border-color);
                }

                .hint {
                    padding: 15px;
                    text-align: center;
                    font-size: var(--font-size-small);
                }

                .hint.warning {
                    color: var(--color-error);
                    font-weight: bold;
                }

                .url-wrapper {
                    display: flex;
                }

                .url-wrapper #copyButton {
                    height: auto;
                    width: 50px;
                    align-items: center;
                }

                .url-input {
                    flex: 1;
                    padding: 15px;
                    font-family: var(--font-family-mono);
                }

            </style>

            <pl-dialog on-dialog-dismiss="${() => this._done()}">

                <div class="title">

                    <pl-icon icon="group"></pl-icon>

                    <div>${name}</div>

                </div>

                <div class="hint">
                    ${$l("Invite people to this group by sharing the following link:")}
                </div>

                <div class="url-wrapper">
                    <pl-input class="url-input" value="${this._url}" multiline autosize readonly></pl-input>
                    <pl-loading-button class="tap" id="copyButton">
                        <pl-icon icon="copy" on-click="${() => this._copyUrl()}"></pl-icon>
                    </pl-loading-button>
                </div>

                <div class="hint warning">
                    ${$l("Never share this link publicly! Only send it to people you trust!")}
                </div>

            </pl-dialog>
        `;
    }

    async show(store: SharedStore): Promise<void> {
        this.store = store;
        this.requestRender();
        await this.renderComplete;
        this._dialog.open = true;
        return new Promise<void>(resolve => {
            this._resolve = resolve;
        });
    }

    private _done() {
        this._resolve && this._resolve();
        this._resolve = null;
        this._dialog.open = false;
    }

    private async _copyUrl() {
        if (this._url) {
            await setClipboard(this._url);
            this._copyButton.success();
        }
    }
}
