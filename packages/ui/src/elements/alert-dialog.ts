import { localize } from "@padlock/core/lib/locale.js";
import { shared, mixins } from "../styles";
import { BaseElement, element, html, property } from "./base.js";
import "./dialog.js";

const defaultButtonLabel = localize("OK");

export type AlertType = "info" | "warning" | "plain" | "question" | "success";
export interface AlertOptions {
    title?: string;
    options?: string[];
    type?: AlertType;
    icon?: string;
    preventDismiss?: boolean;
    hideIcon?: boolean;
    horizontal?: boolean;
}

@element("pl-alert-dialog")
export class AlertDialog extends BaseElement {
    @property() buttonLabel: string = defaultButtonLabel;
    @property() dialogTitle: string = "";
    @property() message: string = "";
    @property({ reflect: true })
    type: AlertType = "info";
    @property() icon = "";
    @property() options: string[] = [];
    @property() preventDismiss: boolean = false;
    @property({ attribute: "hide-icon", reflect: true })
    hideIcon: boolean = false;
    @property() open: boolean = false;
    @property({ reflect: true })
    horizontal: boolean = false;

    private _resolve: ((_: number) => void) | null;

    render() {
        const { open, preventDismiss, message, dialogTitle, options, icon } = this;
        return html`
        ${shared}

        <style>

            :host {
                --pl-dialog-inner: {
                    ${mixins.gradientHighlight()}
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

            :host([horizontal]) .buttons {
                display: flex;
            }

            :host([horizontal]) .buttons > * {
                flex: 1;
            }

            .info-text:not(.small) {
                font-size: var(--font-size-default);
            }
        </style>

        <pl-dialog
            .open=${open}
            .preventDismiss=${preventDismiss}
            @dialog-dismiss=${() => this._selectOption(-1)}>

            <div class="info" ?hidden=${!dialogTitle && !message}>
                <pl-icon class="info-icon" icon="${icon}"></pl-icon>
                <div class="info-body">
                    <div class="info-title">${dialogTitle}</div>
                    <div class="info-text ${this.dialogTitle ? "small" : ""}">${message}</div>
                </div>
            </div>

            <div class="buttons tiles tiles-2">
                ${options.map((o: any, i: number) => html`<button @click=${() => this._selectOption(i)}>${o}</button>`)}
            </div>
        </pl-dialog>
`;
    }

    show(
        message = "",
        {
            title = "",
            options = ["OK"],
            type = "info",
            preventDismiss = false,
            hideIcon = false,
            horizontal = false,
            icon
        }: AlertOptions = {}
    ): Promise<number> {
        this.message = message;
        this.dialogTitle = title;
        this.type = type;
        this.preventDismiss = preventDismiss;
        this.options = options;
        this.hideIcon = hideIcon;
        this.horizontal = horizontal;
        this.icon = icon || this._icon(type);

        setTimeout(() => (this.open = true), 10);

        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }

    private _icon(type: string) {
        switch (type) {
            case "info":
                return "info-round";
            case "warning":
                return "error";
            case "success":
                return "success";
            case "question":
                return "question";
            default:
                return "";
        }
    }

    private _selectOption(i: number) {
        this.open = false;
        this._resolve && this._resolve(i);
        this._resolve = null;
    }
}
