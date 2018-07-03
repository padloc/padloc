import { localize } from "@padlock/core/lib/locale.js";
import { LitElement, html } from "@polymer/lit-element";
import sharedStyles from "../styles/shared";
import "./dialog.js";

const defaultButtonLabel = localize("OK");

class DialogAlert extends LitElement {
    static get properties() {
        return {
            buttonLabel: String,
            dialogTitle: String,
            message: String,
            options: Array,
            preventDismiss: Boolean,
            type: String,
            hideIcon: Boolean,
            open: Boolean
        };
    }

    constructor() {
        super();
        this.buttonLabel = defaultButtonLabel;
        this.dialogTitle = "";
        this.message = "";
        this.options = [];
        this.preventDismiss = false;
        this.type = "info";
        this.hideIcon = false;
        this.ope = false;
    }

    _render(props: any) {
        return html`
        <style>
            ${sharedStyles}

            :host {
                --pl-dialog-inner: {
                    background: linear-gradient(rgb(89, 198, 255) 0%, rgb(7, 124, 185) 100%);
                };
            }

            :host([type="warning"]) {
                --pl-dialog-inner: {
                    background: linear-gradient(180deg, #f49300 0%, #f25b00 100%);
                };
            }

            :host([type="plain"]) {
                --pl-dialog-inner: {
                    background: var(--color-background);
                };
            }

            :host([hide-icon]) .info-icon {
                display: none;
            }

            :host([hide-icon]) .info-text,
            :host([hide-icon]) .info-title {
                text-align: center;
            }

            .info-text:not(.small) {
                font-size: var(--font-size-default);
            }
        </style>

        <pl-dialog
            id="dialog"
            open="${props.open}"
            prevent-dismiss="${props.preventDismiss}"
            on-dialog-dismiss="${() => this._dialogDismiss()}">

            <div class="info" hidden?="${!this.dialogTitle && !this.message}">
                <pl-icon class="info-icon" icon="${this._icon(props.type)}"></pl-icon>
                <div class="info-body">
                    <div class="info-title">${props.dialogTitle}</div>
                    <div class\$="info-text ${this.dialogTitle ? "small" : ""}">${props.message}</div>
                </div>
            </div>
            
            ${props.options.map(
                (o: any, i: number) =>
                    html`<button
                        on-click="${() => this._selectOption(i)}"
                        class$="${this._buttonClass(i)}">
                            ${o}
                        </button>`
            )}
        </pl-dialog>
`;
    }

    show(message = "", { title = "", options = ["OK"], type = "info", preventDismiss = false, hideIcon = false } = {}) {
        this.message = message;
        this.dialogTitle = title;
        this.type = type;
        this.preventDismiss = preventDismiss;
        this.options = options;
        this.hideIcon = hideIcon;

        setTimeout(() => (this.open = true), 10);

        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }

    _icon(type: string) {
        switch (type) {
            case "info":
                return "info-round";
            case "warning":
                return "error";
            case "success":
                return "success";
            case "question":
                return "question";
        }
    }

    _selectOption(i: number) {
        this.open = false;
        typeof this._resolve === "function" && this._resolve(i);
        this._resolve = null;
    }

    _dialogDismiss() {
        typeof this._resolve === "function" && this._resolve();
        this._resolve = null;
    }

    _textClass() {
        return this.dialogTitle ? "small" : "";
    }

    _buttonClass(index: number) {
        return "tap tiles-" + (Math.floor((index + 1) % 8) + 1);
    }

    _hideInfo() {}
}

window.customElements.define("pl-dialog-alert", DialogAlert);
