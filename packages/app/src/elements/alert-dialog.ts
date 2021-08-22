import { translate as $l } from "@padloc/locale/src/translate";
import { html, css, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Dialog } from "./dialog";
import "./button";

const defaultButtonLabel = $l("OK");

export type AlertType = "info" | "warning" | "destructive" | "choice" | "question" | "success";
export interface AlertOptions {
    message?: string;
    title?: string;
    options?: (string | TemplateResult)[];
    type?: AlertType;
    icon?: string;
    preventDismiss?: boolean;
    hideIcon?: boolean;
    vertical?: boolean;
    preventAutoClose?: boolean;
}

@customElement("pl-alert-dialog")
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
    @property({ attribute: false })
    options: (string | TemplateResult)[] = [];
    @property({ type: Boolean, attribute: "hide-icon", reflect: true })
    hideIcon: boolean = false;
    @property({ type: Boolean, reflect: true })
    vertical: boolean = false;

    static styles = [
        ...Dialog.styles,
        css`
            :host {
                --pl-dialog-max-width: 20em;
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
        `,
    ];

    renderContent() {
        const { message, dialogTitle, options, icon, vertical } = this;

        return html`
            <div class="scrolling fit">
                <div class="padded">
                    ${dialogTitle || message
                        ? html`
                              <div class="margined horizontal layout">
                                  <pl-icon class="big" icon="${icon}"></pl-icon>

                                  <div class="stretch left-margined">
                                      <div class="bold large">${dialogTitle}</div>
                                      <div>${message}</div>
                                  </div>
                              </div>

                              <div class="spacer"></div>
                          `
                        : ""}

                    <div
                        class="${vertical || options.length > 2 ? "vertical" : "horizontal stretching"} spacing layout"
                    >
                        ${options.map(
                            (o: any, i: number) =>
                                html`
                                    <pl-button class="${this._buttonClass(i)}" @click=${() => this.done(i)}>
                                        ${o}
                                    </pl-button>
                                `
                        )}
                    </div>
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
        preventAutoClose,
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
