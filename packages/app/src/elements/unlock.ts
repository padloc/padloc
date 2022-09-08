import { translate as $l } from "@padloc/locale/src/translate";
import { ErrorCode } from "@padloc/core/src/error";
import { app, router } from "../globals";
import { isTouch } from "../lib/util";
import { StartForm } from "./start-form";
import { PasswordInput } from "./password-input";
import { Button } from "./button";
import { alert, confirm } from "../lib/dialog";
import "./logo";
import { customElement, query, state } from "lit/decorators.js";
import { css, html } from "lit";
import { authenticate, getPlatformAuthType, supportsPlatformAuthenticator } from "@padloc/core/src/platform";
import { AuthPurpose } from "@padloc/core/src/auth";
import "./popover";

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

        await app.loaded;
        if (
            app.account &&
            app.account.locked &&
            app.remembersMasterKey &&
            document.hasFocus() &&
            !router.history.length
        ) {
            await this._bioAuth();
        }

        setTimeout(async () => {
            this._bioauthButton.classList.toggle("show", await supportsPlatformAuthenticator());
        }, 1000);
    }

    static styles = [
        ...StartForm.styles,
        css`
            .bioauth-button {
                transition: transform 0.5s cubic-bezier(1, -0.3, 0, 1.3), opacity 0.5s;
                margin-bottom: 1em;
                align-self: center;
                font-size: var(--font-size-big);
            }

            .bioauth-button:not(.show) {
                opacity: 0;
                transform: scale(0);
            }

            @supports (-webkit-overflow-scrolling: touch) {
                .bioauth-button {
                    bottom: calc(var(--inset-bottom) + 1em);
                }
            }
        `,
    ];

    render() {
        const email = app.account && app.account.email;
        const invite = this._invite;
        return html`
            <div class="fullbleed double-padded center-aligning vertical layout">
                <div class="stretch"></div>

                <pl-logo class="animated"></pl-logo>

                ${this.app.session?.asAdmin
                    ? html`
                          <div class="animated subtle" style="margin-top: -2em; margin-bottom: 2em;">
                              ${$l("Admin Portal")}
                          </div>
                      `
                    : ""}
                ${invite
                    ? html`
                          <div
                              class="double-padded small box background animated"
                              style="max-width: 25em; margin-bottom: 1.5em"
                          >
                              Hi there! <strong>${invite.invitor}</strong>
                              <span>${$l("has invited you to join their organization")}</span>
                              <strong class="highlighted">${invite.orgName}</strong>.
                              ${invite.email === email
                                  ? html` Before you can accept, you'll need to <strong>unlock the app</strong>. `
                                  : html`
                                        <div class="negative highlight top-margined">
                                            <strong>Warning:</strong> This invite is meant for
                                            <strong>${invite.email}</strong>, but you're logged in as
                                            <strong>${email}</strong>. Before you can accept the invite, you'll have to
                                            <a href="#" class="bold" @click=${this._logout}>log out</a> of the current
                                            account first.
                                        </div>
                                    `}
                          </div>
                      `
                    : html``}

                <form class="double-spacing double-padded vertical layout animated">
                    <div class="subtle small horizontally-padded">
                        ${$l("Welcome back! Please enter your master password to unlock the app.")}
                    </div>

                    <pl-input .label=${$l("Logged In As")} .value="${email || ""}" readonly>
                        <pl-button class="slim transparent round right-half-margined" slot="after">
                            <pl-icon icon="more"></pl-icon>
                        </pl-button>

                        <pl-popover hide-on-click slot="after">
                            <pl-list>
                                <div
                                    class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                                    @click=${this._logout}
                                >
                                    <pl-icon icon="logout"></pl-icon>
                                    <div class="ellipsis">Log Out</div>
                                </div>

                                <div
                                    class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                                    @click=${() => router.go("recover", { email: app.account!.email })}
                                >
                                    <pl-icon icon="question"></pl-icon>
                                    <div class="ellipsis">Forgot Password</div>
                                </div>
                            </pl-list>
                        </pl-popover>
                    </pl-input>

                    <pl-password-input
                        id="passwordInput"
                        required
                        .label=${$l("Enter Master Password")}
                        select-on-focus
                        @enter=${() => this._submit()}
                        @input=${() => this.requestUpdate()}
                    >
                    </pl-password-input>

                    <pl-button
                        id="unlockButton"
                        class="primary"
                        @click=${() => this._submit()}
                        ?disabled=${!this._passwordInput?.value}
                    >
                        <pl-icon icon="unlock" class="right-margined"></pl-icon>
                        <div>${$l("Unlock")}</div>
                    </pl-button>

                    ${this._errorMessage
                        ? html` <div class="negative inverted padded text-centering card">${this._errorMessage}</div> `
                        : ""}
                </form>

                <div class="stretch"></div>

                <pl-button class="bioauth-button transparent" id="bioauthButton" @click=${this._bioAuth}>
                    <pl-icon icon="fingerprint"></pl-icon>
                </pl-button>
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
            const invite = this._invite;
            const { invite: _inv, ...params } = this.router.params;
            this.go(invite ? `invite/${invite.orgId}/${invite.id}` : "", params);
        } catch (e) {
            this._unlockButton.fail();
            if (e.code !== ErrorCode.DECRYPTION_FAILED) {
                throw e;
            }
            if (this._failedCount > 3) {
                await this.app.logout();
                router.go("login");
                alert($l("Failed to unlock too many times. You will have to login again."), {
                    title: $l("Failed To Unlock"),
                    type: "warning",
                });
                return;
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
                    const { token } = await authenticate({
                        purpose: AuthPurpose.AccessKeyStore,
                        type: getPlatformAuthType()!,
                        authenticatorId: rememberedMasterKey.authenticatorId,
                    });
                    await app.unlockWithRememberedMasterKey(token);
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
                    alert(typeof e === "string" ? e : e.message, {
                        title: $l("Biometric Unlock Failed"),
                        type: "warning",
                    });
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
