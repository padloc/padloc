import { translate as $l } from "@padloc/locale/src/translate";
import { Input } from "./input";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { customElement, property, query } from "lit/decorators.js";
import { css, html, TemplateResult } from "lit";

const defaultConfirmLabel = $l("OK");
const defaultCancelLabel = $l("Cancel");
const defaultType = "text";
const defaultPlaceholder = "";

export interface PromptOptions {
    title?: string;
    message?: string | TemplateResult;
    placeholder?: string;
    label?: string;
    type?: string;
    pattern?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    preventDismiss?: boolean;
    validate?: (val: string, input: Input) => Promise<any>;
    value?: string;
    preventAutoClose?: boolean;
}

@customElement("pl-prompt-dialog")
export class PromptDialog extends Dialog<PromptOptions, any> {
    @property()
    confirmLabel: string = defaultConfirmLabel;

    @property()
    cancelLabel: string = defaultCancelLabel;

    @property()
    title: string = "";

    @property()
    message: string | TemplateResult = "";

    @property()
    placeholder: string = defaultPlaceholder;

    @property()
    label: string = "";

    @property({ type: Boolean })
    preventDismiss: boolean = true;

    @property({ reflect: true })
    type: string = defaultType;

    @property()
    pattern: string = "";

    @property({ attribute: false })
    validate?: (val: string, input: Input) => Promise<any>;

    @property()
    private _validationMessage: string = "";

    @query("#confirmButton")
    private _confirmButton: Button;
    @query("pl-input")
    private _input: Input;

    static styles = [
        ...Dialog.styles,
        css`
            .validation-message {
                position: relative;
                margin-top: calc(2 * var(--spacing));
                font-weight: bold;
                font-size: var(--font-size-small);
                color: var(--color-negative);
                text-shadow: none;
                text-align: center;
            }
        `,
    ];

    renderContent() {
        return html`
            <div class="padded content">
                <h1 class="big text-centering margined" ?hidden=${!this.title}>${this.title}</h1>

                <div class="margined" ?hidden=${!this.message}>${this.message}</div>

                <pl-input
                    class="tap"
                    .type=${this.type}
                    .placeholder=${this.placeholder}
                    .label=${this.label}
                    .pattern=${this.pattern}
                    @enter=${() => this._confirmButton.click()}
                >
                </pl-input>

                <div class="spacer"></div>

                <div class="spacing evenly stretching horizontal layout">
                    <pl-button
                        id="confirmButton"
                        class="${this.type === "destructive" ? "negative" : "primary"}"
                        @click=${() => this._confirm()}
                    >
                        ${this.confirmLabel}
                    </pl-button>

                    <pl-button @click=${() => this.done(null)} ?hidden=${!this.cancelLabel}>
                        ${this.cancelLabel}
                    </pl-button>
                </div>
            </div>
        `;
    }

    renderAfter() {
        return html` <div class="validation-message" slot="after">${this._validationMessage}</div> `;
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
        pattern = "",
        confirmLabel = defaultConfirmLabel,
        cancelLabel = defaultCancelLabel,
        preventDismiss = true,
        preventAutoClose = false,
        validate,
    }: PromptOptions = {}) {
        this.title = title;
        this.message = message;
        this.type = type;
        this.pattern = pattern;
        this.placeholder = placeholder;
        this.label = label;
        this.confirmLabel = confirmLabel;
        this.cancelLabel = cancelLabel;
        this.preventDismiss = preventDismiss;
        this.preventAutoClose = preventAutoClose;
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
