import { translate as $l } from "@padloc/locale/src/translate";
import { ErrorCode } from "@padloc/core/src/error";
import { app, router } from "../globals";
import { isTouch } from "../lib/util";
import { StartForm } from "./start-form";
import { PasswordInput } from "./password-input";
import { Button } from "./button";
import { alert, confirm, choose } from "../lib/dialog";
import "./logo";
import { customElement, query, state } from "lit/decorators.js";
import { css, html } from "lit";
import { getMFAToken, supportsPlatformAuthenticator } from "@padloc/core/src/platform";
import { MFAPurpose, MFAType } from "@padloc/core/src/mfa";

@customElement("pl-unlock")
export class Unlock extends StartForm {
    readonly routePattern = /^unlock$/;

    @state()
    private _errorMessage: string;

    @query("#passwordInput")
    private _passwordInput: PasswordInput;

    @query("#unlockButton")
    private _unlockButton: Button;

    @query("#bioauthButton")
    private _bioauthButton: Button;

    private _failedCount = 0;

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener("visibilitychange", () => this._focused());
    }

    async reset() {
        if (!this._passwordInput) {
            return;
        }
        this._passwordInput.value = "";
        this._errorMessage = "";
        this._unlockButton.stop();
        this._failedCount = 0;
        super.reset();

        if (!isTouch()) {
            setTimeout(() => this._passwordInput.focus(), 100);
        }

        const { nobio, ...params } = router.params;

        await app.loaded;
        if (
            app.account &&
            app.account.locked &&
            supportsPlatformAuthenticator() &&
            app.remembersMasterKey &&
            !("nobio" in router.params)
        ) {
            this._bioAuth();
        }

        router.params = params;

        setTimeout(() => {
            this._bioauthButton.classList.toggle("show", supportsPlatformAuthenticator());
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

            .account pl-button {
                position: absolute;
                right: 5px;
                top: 6px;
            }

            .bioauth-button {
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
        `,
    ];

    render() {
        const email = app.account && app.account.email;
        return html`
            <div class="fullbleed center-aligning vertical layout">
                <div class="stretch"></div>

                <form>
                    <pl-logo class="animated"></pl-logo>

                    <pl-input class="animated" .label=${$l("Logged In As")} .value="${email || ""}" readonly>
                        <pl-button class="transparent round" slot="after">
                            <pl-icon icon="more" @click=${this._showMenu}></pl-icon>
                        </pl-button>
                    </pl-input>

                    <pl-password-input
                        id="passwordInput"
                        required
                        .label=${$l("Enter Master Password")}
                        class="animated"
                        select-on-focus
                        @enter=${() => this._submit()}
                    >
                    </pl-password-input>

                    <pl-button id="unlockButton" class="animated" @click=${() => this._submit()}>
                        ${$l("Unlock")}
                    </pl-button>

                    <div class="red inverted padded text-centering card" ?hidden=${!this._errorMessage}>
                        ${this._errorMessage}
                    </div>
                </form>

                <pl-button class="bioauth-button round transparent" id="bioauthButton" @click=${this._bioAuth}>
                    <pl-icon icon="fingerprint"></pl-icon>
                </pl-button>

                <div class="stretch"></div>
            </div>
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
            this.go("");
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
        const confirmed = await confirm(
            $l("Are you sure you want to log out of this account?"),
            $l("Log Out"),
            $l("Cancel"),
            {
                title: $l("Log Out"),
                icon: "logout",
            }
        );
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
            const rememberedMasterKey = app.state.rememberedMasterKey;
            if (rememberedMasterKey) {
                try {
                    const mfaToken = await getMFAToken({
                        purpose: MFAPurpose.AccessKeyStore,
                        type: MFAType.WebAuthnPlatform,
                        authenticatorId: rememberedMasterKey.authenticatorId,
                    });
                    await app.unlockWithRememberedMasterKey(mfaToken);
                } catch (e) {
                    this._bioauthButton.fail();
                    if (e.code === ErrorCode.NOT_FOUND) {
                        this.dispatchEvent(
                            new CustomEvent("enable-biometric-auth", {
                                detail: {
                                    message: $l("Biometric unlock expired. Complete setup to reeneable."),
                                },
                                bubbles: true,
                                composed: true,
                            })
                        );
                        return;
                    }
                    alert(e.message, { title: $l("Biometric Unlock Failed"), type: "warning" });
                    return;
                }

                this._bioauthButton.success();
                this.done();
                this.go("");
            } else {
                this.dispatchEvent(
                    new CustomEvent("enable-biometric-auth", {
                        bubbles: true,
                        composed: true,
                    })
                );
                this._bioauthButton.stop();
            }
        } catch (error) {
            this._bioauthButton.fail();
            alert($l("Biometric unlock failed! Reason: {0}", error.message), {
                title: $l("Failed To Unlock"),
                type: "warning",
            });
        }
    }

    private _focused() {
        setTimeout(() => {
            if (app.state.locked && this.classList.contains("showing") && document.visibilityState !== "hidden") {
                this._passwordInput && this._passwordInput.focus();
            }
        }, 100);
    }
}
