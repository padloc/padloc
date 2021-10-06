import { shared, mixins } from "../styles";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import "./unlock";
import "./recover";
import "./login-signup";
import { customElement, property } from "lit/decorators.js";
import { css, html, LitElement } from "lit";

@customElement("pl-start")
export class Start extends Routing(StateMixin(LitElement)) {
    readonly routePattern = /^(start|unlock|login|signup|recover)/;

    // private readonly _pages = ["unlock", "login", "signup", "recover"];

    @property()
    private _page: string;

    handleRoute([page]: [string]) {
        this._page = page;
    }

    static styles = [
        shared,
        css`
            :host {
                /* --color-foreground: var(--color-white);
                --color-highlight: var(--color-black);
                color: var(--color-foreground); */
                display: flex;
                flex-direction: column;
                z-index: 5;
                /* text-shadow: var(--text-shadow); */
                background: var(--start-background);
                transition: transform 0.4s cubic-bezier(1, 0, 0.2, 1);
                ${mixins.fullbleed()};
            }

            :host(:not([active])) {
                pointer-events: none;
                transition-delay: 0.4s;
                transform: translate3d(0, -100%, 0);
            }
        `,
    ];

    render() {
        return html`
            <pl-login-signup
                class="fullbleed"
                ?invisible=${!["start", "login", "signup"].includes(this._page)}
            ></pl-login-signup>

            <pl-unlock class="fullbleed" ?invisible=${this._page !== "unlock"}></pl-unlock>

            <pl-recover class="fullbleed" ?invisible=${this._page !== "recover"}></pl-recover>
        `;
    }
}
