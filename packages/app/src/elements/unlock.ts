import { translate as $l } from "@padloc/locale/src/translate";
import { ErrorCode } from "@padloc/core/src/error";
import { biometricAuth } from "@padloc/core/src/platform";
import { app, router } from "../globals";
import { isTouch } from "../lib/util";
import { element, property, html, css, query, listen } from "./base";
import { StartForm } from "./start-form";
import { PasswordInput } from "./password-input";
import { LoadingButton } from "./loading-button";
import { alert, confirm, choose } from "../lib/dialog";
import "./logo";

@element("pl-unlock")
export class Unlock extends StartForm {
    @property()
    private _errorMessage: string;

    @query("#passwordInput")
    private _passwordInput: PasswordInput;

    @query("#unlockButton")
    private _unlockButton: LoadingButton;

    @query("#bioauthButton")
    private _bioauthButton: LoadingButton;

    private _failedCount = 0;

    async reset() {
        this._passwordInput.value = "";
        this._errorMessage = "";
        this._unlockButton.stop();
        this._failedCount = 0;
        super.reset();

        if (!isTouch()) {
            setTimeout(() => this._passwordInput.focus(), 100);
        }

        if (
            app.account &&
            app.account.locked &&
            app.supportsBiometricUnlock &&
            app.remembersMasterKey &&
            !("nobio" in router.params)
        ) {
            this._bioAuth();
        }

        setTimeout(() => {
            this._bioauthButton.classList.toggle("show", app.supportsBiometricUnlock);
        }, 1000);
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

            .bioauth-button {
                background: transparent;
                width: 50px;
                transition: transform 0.5s cubic-bezier(1, -0.3, 0, 1.3), opacity 0.5s;
                position: absolute;
                bottom: 12px;
                left: 0;
                right: 0;
                margin: auto;
            }

            .bioauth-button:not(.show) {
                opacity: 0;
                transform: scale(0);
            }

            .bioauth-button pl-icon {
                font-size: 140%;
                width: 50px;
                height: 50px;
            }

            @supports (-webkit-overflow-scrolling: touch) {
                .bioauth-button {
                    bottom: max(env(safe-area-inset-bottom), 12px);
                }
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

            <pl-loading-button class="bioauth-button icon tap" id="bioauthButton" @click=${this._bioAuth}>
                <pl-icon icon="fingerprint"></pl-icon>
            </pl-loading-button>
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

    private async _bioAuth() {
        if (this._bioauthButton.state === "loading") {
            return;
        }

        this._bioauthButton.start();

        try {
            if (app.remembersMasterKey) {
                const authenticated = await biometricAuth();

                if (!authenticated) {
                    this._bioauthButton.fail();
                    return;
                }

                try {
                    await app.unlockWithRememberedMasterKey();
                } catch (e) {
                    this.dispatch("enable-biometric-auth", {
                        message: $l("Biometric unlock expired. Complete setup to reeneable.")
                    });
                }

                this._bioauthButton.success();
            } else {
                this.dispatch("enable-biometric-auth");
                this._bioauthButton.stop();
            }
        } catch (error) {
            this._bioauthButton.fail();
            alert($l("Biometric unlock failed! Reason: {0}", error.message), {
                title: $l("Failed To Unlock"),
                type: "warning"
            });
        }
    }

    @listen("visibilitychange", document)
    _focused() {
        setTimeout(() => {
            if (app.state.locked && this.classList.contains("showing") && document.visibilityState !== "hidden") {
                this._passwordInput && this._passwordInput.focus();
            }
        }, 100);
    }
}
