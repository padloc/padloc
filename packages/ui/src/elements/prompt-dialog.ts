import { localize } from "@padlock/core/lib/locale.js";
import { shared } from "../styles";
import { BaseElement, element, html, property, query } from "./base.js";
import { Input } from "./input.js";
import { LoadingButton } from "./loading-button.js";
import { Dialog } from "./dialog.js";

const defaultConfirmLabel = localize("OK");
const defaultCancelLabel = localize("Cancel");
const defaultType = "text";
const defaultPlaceholder = "";

export interface PromptOptions {
    placeholder?: string;
    type?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    preventDismiss?: boolean;
    validate?: (val: string, input: Input) => Promise<string>;
}

@element("pl-prompt-dialog")
export class PromptDialog extends BaseElement {
    @property() confirmLabel: string = defaultConfirmLabel;
    @property() cancelLabel: string = defaultCancelLabel;
    @property() message: string = "";
    @property() open: boolean = false;
    @property() placeholder: string = defaultPlaceholder;
    @property() preventDismiss: boolean = true;
    @property() type: string = defaultType;
    @property() validate?: (val: string, input: Input) => Promise<string>;
    @property() private _validationMessage: string = "";

    @query("#confirmButton") private _confirmButton: LoadingButton;
    @query("pl-input") private _input: Input;
    @query("pl-dialog") private _dialog: Dialog;

    private _resolve: ((val: string | null) => void) | null;

    render() {
        return html`
        ${shared}

        <style include="shared">

            :host {
                --pl-dialog-inner: {
                    background: linear-gradient(rgb(89, 198, 255) 0%, rgb(7, 124, 185) 100%);
                };
            }

            pl-input {
                text-align: center;
            }

            .validation-message {
                position: relative;
                margin-top: 15px;
                font-weight: bold;
                font-size: var(--font-size-small);
                color: var(--color-error);
                text-shadow: none;
                text-align: center;
            }
        </style>

        <pl-dialog
            .open=${this.open}
            .preventDismiss=${this.preventDismiss}
            @dialog-dismiss=${() => this._dismiss()}>

            <div class="message tiles-1" ?hidden=${!this.message}>${this.message}</div>

            <pl-input
                class="tiles-2"
                .type=${this.type}
                .placeholder=${this.placeholder}
                @enter=${() => this._confirmButton.click()}>
            </pl-input>

            <pl-loading-button id="confirmButton" class="tap tiles-3" @click=${() => this._confirm()}>
                ${this.confirmLabel}
            </pl-loading-button>

            <button class="tap tiles-4" @click=${() => this._dismiss()} ?hidden=${!this.cancelLabel}>
                ${this.cancelLabel}
            </button>

            <div class="validation-message" slot="after">${this._validationMessage}</div>

        </pl-dialog>
`;
    }

    private _success(val: string) {
        this._validationMessage = "";
        this._resolve && this._resolve(val);
        this._resolve = null;
        this.open = false;
    }

    private async _confirm() {
        let val = this._input.value;
        if (this.validate) {
            this._confirmButton.start();
            try {
                val = await this.validate(val, this._input);
                this._confirmButton.success();
                this._success(val);
            } catch (e) {
                this._dialog.rumble();
                this._validationMessage = e;
                this._confirmButton.fail();
            }
        } else {
            this._success(val);
        }
    }

    private _dismiss() {
        this._resolve && this._resolve(null);
        this._resolve = null;
        this.open = false;
    }

    show(
        message = "",
        {
            placeholder = defaultPlaceholder,
            type = defaultType,
            confirmLabel = defaultConfirmLabel,
            cancelLabel = defaultCancelLabel,
            preventDismiss = true,
            validate
        }: PromptOptions = {}
    ) {
        this._confirmButton.stop();
        this.message = message;
        this.type = type;
        this.placeholder = placeholder;
        this.confirmLabel = confirmLabel;
        this.cancelLabel = cancelLabel;
        this.preventDismiss = preventDismiss;
        this.validate = validate;
        this._validationMessage = "";
        this._input.value = "";
        this.open = true;

        setTimeout(() => this._input.focus(), 100);

        return new Promise<string | null>(resolve => {
            this._resolve = resolve;
        });
    }
}
