import { app } from "../init.js";
import { config, shared } from "../styles";
import { BaseElement, element, html, property, listen, query } from "./base.js";
import { Unlock } from "./unlock.js";
import { Login } from "./login.js";
import { Signup } from "./signup.js";

export type StartViewMode = "unlock" | "get-started";

@element("pl-start")
export class Start extends BaseElement {
    @property({ reflect: true })
    open: boolean = false;

    @query("pl-unlock") private _unlockForm: Unlock;
    @query("pl-login") private _loginForm: Login;
    @query("pl-signup") private _signupForm: Signup;

    @listen("load", app)
    @listen("lock", app)
    @listen("unlock", app)
    _updateOpen() {
        this.open = !app.locked;
    }

    @listen("load", app)
    @listen("lock", app)
    @listen("logout", app)
    _updateForm() {
        if (app.account) {
            this._showForm(this._unlockForm);
        } else {
            this._showForm(this._loginForm);
        }
    }

    _showForm(form: Unlock | Login | Signup) {
        for (const f of [this._unlockForm, this._loginForm, this._signupForm]) {
            if (f === form) {
                f.classList.add("showing");
                f.reset();
            } else {
                f.classList.remove("showing");
                f.done();
            }
        }
    }

    _render() {
        return html`

            ${config}
            ${shared}

            <style>

                :host {
                    --color-background: var(--color-primary);
                    --color-foreground: var(--color-tertiary);
                    --color-highlight: var(--color-secondary);
                    @apply --fullbleed;
                    @apply --scroll;
                    color: var(--color-foreground);
                    display: flex;
                    flex-direction: column;
                    z-index: 5;
                    text-align: center;
                    text-shadow: rgba(0, 0, 0, 0.15) 0 2px 0;
                    background: linear-gradient(180deg, #59c6ff 0%, #077cb9 100%);
                    transform: translate3d(0, 0, 0);
                    transition: transform 0.4s cubic-bezier(1, 0, 0.2, 1);
                }

                main {
                    @apply --fullbleed;
                    background: transparent;
                    min-height: 510px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }

                .form:not(.showing) {
                    opacity: 0;
                    transition: opacity 0.2s;
                    pointer-events: none;
                }

                :host([open]) {
                    pointer-events: none;
                }

                :host([open]) {
                    transition-delay: 0.4s;
                    transform: translate3d(0, -100%, 0);
                }
            </style>

            <pl-unlock class="form"></pl-unlock>
            <pl-login class="form" on-signup="${() => this._showForm(this._signupForm)}"></pl-login>
            <pl-signup class="form" on-cancel="${() => this._showForm(this._loginForm)}"></pl-signup>
        `;
    }
}
