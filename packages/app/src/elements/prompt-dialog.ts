import { translate as $l } from "@padloc/locale/src/translate";
import { element, html, css, property, query } from "./base";
import { Input } from "./input";
import { LoadingButton } from "./loading-button";
import { Dialog } from "./dialog";

const defaultConfirmLabel = $l("OK");
const defaultCancelLabel = $l("Cancel");
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
    @property({ reflect: true })
    type: string = defaultType;
    @property()
    validate?: (val: string, input: Input) => Promise<string>;
    @property()
    private _validationMessage: string = "";

    @query("#confirmButton")
    private _confirmButton: LoadingButton;
    @query("pl-input")
    private _input: Input;

    static styles = [
        ...Dialog.styles,
        css`
            h1 {
                display: block;
                text-align: center;
            }

            .message {
                margin: 20px;
                text-align: center;
            }

            pl-input {
                text-align: center;
                margin: 8px;
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
        `
    ];

    renderContent() {
        return html`
            <div class="content">
                <h1 ?hidden=${!this.title}>${this.title}</h1>

                <div class="message" ?hidden=${!this.message}>${this.message}</div>

                <pl-input
                    class="tap"
                    .type=${this.type}
                    .placeholder=${this.placeholder}
                    .label=${this.label}
                    @enter=${() => this._confirmButton.click()}
                >
                </pl-input>

                <div class="actions">
                    <pl-loading-button
                        id="confirmButton"
                        class="tap ${this.type === "destructive" ? "negative" : "primary"}"
                        @click=${() => this._confirm()}
                    >
                        ${this.confirmLabel}
                    </pl-loading-button>

                    <button class="tap" @click=${() => this.done(null)} ?hidden=${!this.cancelLabel}>
                        ${this.cancelLabel}
                    </button>
                </div>
            </div>
        `;
    }

    renderAfter() {
        return html`
            <div class="validation-message" slot="after">${this._validationMessage}</div>
        `;
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

        setTimeout(() => this._input.focus(), 300);

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
