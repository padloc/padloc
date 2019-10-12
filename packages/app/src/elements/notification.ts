import { getSingleton } from "../lib/singleton";
import { shared, mixins } from "../styles";
import { BaseElement, element, html, css, property } from "./base";

export type NotificationType = "info" | "warning";

export interface NotificationParams {
    message: string;
    duration?: number;
    type?: NotificationType;
}

@element("pl-notification")
export class Notification extends BaseElement {
    @property()
    duration: number = 2000;
    @property()
    message: string = "";
    @property({ reflect: true })
    type: NotificationType = "info";

    private _hideTimeout: number;

    static styles = [
        shared,
        css`
            :host {
                display: flex;
                align-items: center;
                text-align: center;
                transition: transform 0.5s cubic-bezier(1, -0.3, 0, 1.3);
                position: fixed;
                left: 15px;
                right: 15px;
                bottom: 15px;
                z-index: 10;
                max-width: 400px;
                margin: 0 auto;
                border-radius: var(--border-radius);
                color: var(--color-background);
                text-shadow: rgba(0, 0, 0, 0.2) 0 2px 0;
                ${mixins.gradientDark(true)}
            }

            :host(:not(.showing)) {
                transform: translateY(130%);
            }

            :host([type="warning"]) {
                ${mixins.gradientWarning(true)}
            }

            .message {
                flex: 1;
                min-width: 0;
                padding: 15px 0 15px 15px;
                font-weight: bold;
            }

            pl-icon.close-button {
                margin: auto 5px;
            }
        `
    ];

    render() {
        return html`
            <div class="message">${this.message}</div>

            <pl-icon icon="close" class="close-button tap" @click=${() => this.dismiss()}></pl-icon>
        `;
    }

    async show({ message, duration = 2000, type = "info" }: NotificationParams) {
        clearTimeout(this._hideTimeout);
        this.message = message;
        this.type = type;

        await this.updateComplete;
        this.classList.add("showing");

        this._hideTimeout = window.setTimeout(() => this.dismiss(), duration);
    }

    dismiss() {
        this.classList.remove("showing");
    }
}

export function notify(message: string, params: Partial<NotificationParams> = {}) {
    const notification = getSingleton("pl-notification") as Notification;
    notification.show({ ...params, message });
}
