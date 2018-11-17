import { localize } from "@padlock/core/lib/locale.js";
import { element, html, property, query } from "./base.js";
import { Input } from "./input.js";
import { LoadingButton } from "./loading-button.js";
import { Dialog } from "./dialog.js";

const defaultConfirmLabel = localize("OK");
const defaultCancelLabel = localize("Cancel");
const defaultType = "text";
const defaultPlaceholder = "";

export interface PromptOptions {
    title?: string;
    message?: string;
    placeholder?: string;
    label?: string;
    type?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    preventDismiss?: boolean;
    validate?: (val: string, input: Input) => Promise<string>;
    value?: string;
}

@element("pl-prompt-dialog")
export class PromptDialog extends Dialog<PromptOptions, string | null> {
    @property()
    confirmLabel: string = defaultConfirmLabel;
    @property()
    cancelLabel: string = defaultCancelLabel;
    @property()
    title: string = "";
    @property()
    message: string = "";
    @property()
    placeholder: string = defaultPlaceholder;
    @property()
    label: string = "";
    @property()
    preventDismiss: boolean = true;
    @property()
    type: string = defaultType;
    @property()
    validate?: (val: string, input: Input) => Promise<string>;
    @property()
    private _validationMessage: string = "";

    @query("#confirmButton")
    private _confirmButton: LoadingButton;
    @query("pl-input")
    private _input: Input;

    renderContent() {
        return html`
        <style>
            h1 {
                display: block;
                text-align: center;
            }

            .message {
                margin: 20px;
                text-align: center;
            }

            pl-input, pl-loading-button, button {
                text-align: center;
                background: var(--shade-2-color);
                border-radius: 8px;
            }

            pl-input {
                margin: 10px;
            }

            .buttons {
                margin: 10px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                grid-gap: 8px;
            }

            .confirm {
                font-weight: bold;
                background: var(--shade-4-color);
            }

            .cancel {
                background: var(--shade-3-color);
                margin-left: 0;
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

        <h1 ?hidden=${!this.title}>${this.title}</h1>

        <div class="message" ?hidden=${!this.message}>${this.message}</div>

        <pl-input
            class="tap"
            .type=${this.type}
            .placeholder=${this.placeholder}
            .label=${this.label}
            @enter=${() => this._confirmButton.click()}>
        </pl-input>

        <div class="buttons">

            <pl-loading-button
                id="confirmButton"
                class="tap confirm"
                @click=${() => this._confirm()}>
                ${this.confirmLabel}
            </pl-loading-button>

            <button class="tap cancel" @click=${() => this.done(null)} ?hidden=${!this.cancelLabel}>
                ${this.cancelLabel}
            </button>

        </div>
`;
    }

    renderAfter() {
        return html`<div class="validation-message" slot="after">${this._validationMessage}</div>`;
    }

    done(val: string | null) {
        this._validationMessage = "";
        super.done(val);
    }

    async show({
        title = "",
        message = "",
        placeholder = defaultPlaceholder,
        label = "",
        value = "",
        type = defaultType,
        confirmLabel = defaultConfirmLabel,
        cancelLabel = defaultCancelLabel,
        preventDismiss = true,
        validate
    }: PromptOptions = {}) {
        this.title = title;
        this.message = message;
        this.type = type;
        this.placeholder = placeholder;
        this.label = label;
        this.confirmLabel = confirmLabel;
        this.cancelLabel = cancelLabel;
        this.preventDismiss = preventDismiss;
        this.validate = validate;
        this._validationMessage = "";
        await this.updateComplete;
        this._confirmButton.stop();
        this._input.value = value;

        setTimeout(() => this._input.focus(), 100);

        return super.show();
    }

    private async _confirm() {
        let val = this._input.value;
        if (this.validate) {
            this._confirmButton.start();
            try {
                val = await this.validate(val, this._input);
                this._confirmButton.success();
                this.done(val);
            } catch (e) {
                this.rumble();
                this._validationMessage = e;
                this._confirmButton.fail();
            }
        } else {
            this.done(val);
        }
    }
}
