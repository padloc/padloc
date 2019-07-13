import { localize as $l } from "@padloc/core/src/locale";
import { ErrorCode } from "@padloc/core/src/error";
import { app, router } from "../init";
import { element, property, html, css, query } from "./base";
import { StartForm } from "./start-form";
import { PasswordInput } from "./password-input";
import { LoadingButton } from "./loading-button";
import { confirm, choose } from "../dialog";
import "./logo";

@element("pl-unlock")
export class Unlock extends StartForm {
    @property()
    private _errorMessage: string;

    @query("#passwordInput")
    private _passwordInput: PasswordInput;
    @query("#unlockButton")
    private _unlockButton: LoadingButton;

    private _failedCount = 0;

    reset() {
        this._passwordInput.value = "";
        this._errorMessage = "";
        this._unlockButton.stop();
        this._failedCount = 0;
        super.reset();
        setTimeout(() => this._passwordInput.focus(), 100);
    }

    static styles = [
        ...StartForm.styles,
        css`
            .current-account {
                font-size: var(--font-size-tiny);
                margin: 30px;
            }

            .logout {
                text-decoration: underline;
                cursor: pointer;
            }

            .account {
                position: relative;
            }

            .account pl-icon {
                position: absolute;
                right: 5px;
                top: 6px;
            }
        `
    ];

    render() {
        const email = app.account && app.account.email;
        return html`
            <div flex></div>

            <form>
                <pl-logo class="animate"></pl-logo>

                <div class="account animate">
                    <pl-input .label=${$l("Logged In As")} .value="${email}" readonly></pl-input>
                    <pl-icon icon="more" class="tap" @click=${this._showMenu}></pl-icon>
                </div>

                <pl-password-input
                    id="passwordInput"
                    required
                    .label=${$l("Enter Master Password")}
                    class="animate"
                    select-on-focus
                    @enter=${() => this._submit()}
                >
                </pl-password-input>

                <pl-loading-button id="unlockButton" class="tap animate" @click=${() => this._submit()}>
                    ${$l("Unlock")}
                </pl-loading-button>

                <div class="error note" ?hidden=${!this._errorMessage}>${this._errorMessage}</div>
            </form>

            <div flex></div>
        `;
    }

    private async _submit() {
        if (this._unlockButton.state === "loading") {
            return;
        }

        this._passwordInput.blur();

        if (!this._passwordInput.value) {
            this._errorMessage = $l("Please enter your master password!");
            this.rumble();
            this._passwordInput.focus();
            return;
        }

        this._errorMessage = "";
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
            this._errorMessage = $l("Wrong password! Please try again.");
            this.rumble();

            this._failedCount++;
            if (this._failedCount > 2) {
                const recover = await confirm(
                    $l("Can't remember your master password?"),
                    $l("Recover Account"),
                    $l("Try Again")
                );
                if (recover) {
                    router.go("recover", { email: app.account!.email });
                }
            } else {
                this._passwordInput.focus();
            }
        }
    }

    private async _showMenu() {
        const choice = await choose("", [$l("Logout / Switch Account"), $l("Forgot Password")]);
        switch (choice) {
            case 0:
                this._logout();
                break;
            case 1:
                router.go("recover", { email: app.account!.email });
                break;
        }
    }

    private async _logout() {
        const confirmed = await confirm($l("Are you sure you want to log out of this account?"));
        if (confirmed) {
            await app.logout();
            router.go("login");
        }
    }
}
