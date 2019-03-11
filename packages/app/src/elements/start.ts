import { app } from "../init.js";
import { shared, mixins } from "../styles";
import { BaseElement, element, html, property, listen, query } from "./base.js";
import { Unlock } from "./unlock.js";
import { Login } from "./login.js";
import { Signup } from "./signup.js";
import { Recover } from "./recover.js";

@element("pl-start")
export class Start extends BaseElement {
    @property({ reflect: true })
    open: boolean = false;

    @query("pl-unlock")
    private _unlockForm: Unlock;
    @query("pl-login")
    private _loginForm: Login;
    @query("pl-signup")
    private _signupForm: Signup;
    @query("pl-recover")
    private _recoverForm: Recover;

    async unlock() {
        await this.updateComplete;
        this._showForm(this._unlockForm);
    }

    async login() {
        await this.updateComplete;
        this._showForm(this._loginForm);
    }

    async signup(step?: string) {
        await this.updateComplete;
        this._signupForm.goToStep(step);
        this._showForm(this._signupForm);
    }

    async recover() {
        await this.updateComplete;
        this._showForm(this._recoverForm);
    }

    @listen("lock", app)
    @listen("unlock", app)
    _updateOpen() {
        this.open = !app.locked;
    }

    async _showForm(form: Unlock | Login | Signup | Recover) {
        for (const f of [this._unlockForm, this._loginForm, this._signupForm, this._recoverForm]) {
            if (f === form) {
                f.classList.add("showing");
                f.reset();
            } else {
                f.classList.remove("showing");
                f.done();
            }
        }
    }

    render() {
        return html`
            ${shared}

            <style>

                :host {
                    --color-background: var(--color-primary);
                    --color-foreground: var(--color-tertiary);
                    --color-highlight: var(--color-secondary);
                    color: var(--color-foreground);
                    display: flex;
                    flex-direction: column;
                    z-index: 5;
                    text-align: center;
                    text-shadow: rgba(0, 0, 0, 0.15) 0 2px 0;
                    background: linear-gradient(180deg, #59c6ff 0%, #077cb9 100%);
                    transform: translate3d(0, 0, 0);
                    transition: transform 0.4s cubic-bezier(1, 0, 0.2, 1);
                    ${mixins.fullbleed()}
                    ${mixins.scroll()}
                }

                main {
                    ${mixins.fullbleed()}
                    background: transparent;
                    min-height: 510px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }

                .form:not(.showing) {
                    opacity: 0;
                    transition: opacity 1s;
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

            <pl-login class="form"></pl-login>

            <pl-signup class="form"></pl-signup>

            <pl-recover class="form"></pl-recover>
        `;
    }
}
