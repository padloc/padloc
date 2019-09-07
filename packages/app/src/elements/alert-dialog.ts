import { translate as $l } from "@padloc/locale/src/translate";
import { element, html, property, css } from "./base";
import { Dialog } from "./dialog";

const defaultButtonLabel = $l("OK");

export type AlertType = "info" | "warning" | "destructive" | "choice" | "question" | "success";
export interface AlertOptions {
    message?: string;
    title?: string;
    options?: string[];
    type?: AlertType;
    icon?: string;
    preventDismiss?: boolean;
    hideIcon?: boolean;
    vertical?: boolean;
    preventAutoClose?: boolean;
}

@element("pl-alert-dialog")
export class AlertDialog extends Dialog<AlertOptions, number> {
    @property()
    buttonLabel: string = defaultButtonLabel;
    @property()
    dialogTitle: string = "";
    @property()
    message: string = "";
    @property({ reflect: true, attribute: "type" })
    type: AlertType = "info";
    @property()
    icon = "";
    @property()
    options: string[] = [];
    @property({ attribute: "hide-icon", reflect: true })
    hideIcon: boolean = false;
    @property({ reflect: true })
    vertical: boolean = false;

    static styles = [
        ...Dialog.styles,
        css`
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
        `
    ];

    renderContent() {
        const { message, dialogTitle, options, icon, vertical } = this;

        return html`
            <div class="content">
                <div class="info" ?hidden=${!dialogTitle && !message}>
                    <pl-icon class="info-icon" icon="${icon}"></pl-icon>
                    <div class="info-body">
                        <div class="info-title">${dialogTitle}</div>
                        <div class="info-text ${this.dialogTitle ? "small" : ""}">${message}</div>
                    </div>
                </div>

                <div class="actions ${vertical || options.length > 2 ? "vertical" : ""}">
                    ${options.map(
                        (o: any, i: number) =>
                            html`
                                <button class="tap ${this._buttonClass(i)}" @click=${() => this.done(i)}>${o}</button>
                            `
                    )}
                </div>
            </div>
        `;
    }

    done(i: number = -1) {
        super.done(i);
    }

    show({
        message = "",
        title = "",
        options = ["OK"],
        type = "info",
        preventDismiss = false,
        hideIcon = false,
        vertical = false,
        icon,
        preventAutoClose
    }: AlertOptions = {}): Promise<number> {
        this.message = message;
        this.dialogTitle = title;
        this.type = type;
        this.preventDismiss = preventDismiss;
        this.options = options;
        this.hideIcon = hideIcon;
        this.vertical = vertical;
        this.icon = icon || this._icon(type);
        if (typeof preventAutoClose !== "undefined") {
            this.preventAutoClose = preventAutoClose;
        }

        return super.show();
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
            case "choice":
            case "destructive":
                return "question";
            default:
                return "";
        }
    }

    private _buttonClass(i: number) {
        if (i === 0) {
            return this.type === "destructive" ? "negative" : this.type !== "choice" ? "primary" : "";
        } else {
            return "";
        }
    }
}
