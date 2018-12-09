import { localize as $l } from "@padloc/core/lib/locale.js";
import { ErrorCode } from "@padloc/core/lib/error.js";
import { app } from "../init.js";
import { element, html, query } from "./base.js";
import { StartForm, sharedStyles } from "./start-form";
import { Input } from "./input.js";
import { LoadingButton } from "./loading-button.js";
import { alert, confirm } from "../dialog.js";
import "./logo.js";

@element("pl-unlock")
export class Unlock extends StartForm {
    @query("#passwordInput")
    private _passwordInput: Input;
    @query("#unlockButton")
    private _unlockButton: LoadingButton;

    reset() {
        this._passwordInput.value = "";
        this._unlockButton.stop();
        super.reset();
        setTimeout(() => this._passwordInput.focus(), 100);
    }

    render() {
        const email = app.account && app.account.email;
        return html`
            ${sharedStyles}

            <style>
                .current-account {
                    font-size: var(--font-size-tiny);
                    margin: 30px;
                }

                .logout {
                    text-decoration: underline;
                    cursor: pointer;
                }
            </style>

            <div flex></div>

            <form>

                <pl-logo class="animate"></pl-logo>

                <pl-input
                    id="passwordInput"
                    type="password"
                    required
                    .label=${$l("Enter Master Password")}
                    class="tiles-2 animate tap"
                    @enter=${() => this._submit()}>
                </pl-input>

                <pl-loading-button id="unlockButton" class="tap tiles-3 animate" @click=${() => this._submit()}>
                    ${$l("Unlock")}
                </pl-loading-button>

            </form>

            <div flex></div>

            <div class="current-account animate">

                <span>${$l("You are logged in as")}</span>

                <strong>${email}</strong>.

                <span class="logout" @click=${() => this._logout()}>Log Out</span>

            </div>
        `;
    }

    private async _submit() {
        if (this._unlockButton.state === "loading") {
            return;
        }

        this._passwordInput.blur();

        if (!this._passwordInput.value) {
            await alert($l("Please enter your master password!"), { type: "warning" });
        }

        this._unlockButton.start();
        try {
            await app.unlock(this._passwordInput.value);
            this._unlockButton.success();
            this.done();
        } catch (e) {
            this._unlockButton.fail();
            if (e.code !== ErrorCode.DECRYPTION_FAILED) {
                throw e;
            }
            alert($l("Wrong password! Please try again!"), { type: "warning" });
        }
    }

    private async _logout() {
        const confirmed = await confirm($l("Are you sure you want to log out of this account?"));
        if (confirmed) {
            await app.logout();
        }
    }
}
