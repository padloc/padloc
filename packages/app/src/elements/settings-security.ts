import "./list";
import "./button";
import "./scroller";
import { html, LitElement } from "lit";
import { StateMixin } from "../mixins/state";
import { isWebAuthnSupported, registerAuthenticator } from "../lib/mfa";
import { app, router } from "../globals";
import { prompt, alert, confirm, choose } from "../lib/dialog";
import { translate as $l } from "@padloc/locale/src/translate";
import { live } from "lit/directives/live";
import { ToggleButton } from "./toggle-button";
import { customElement, query } from "lit/decorators.js";
import { shared } from "../styles";
import { Slider } from "./slider";
import { AuthInfo, UpdateAuthParams } from "@padloc/core/src/api";
import { state } from "lit/decorators.js";
import { Routing } from "../mixins/routing";
import { MFAPurpose, MFAType, MFAuthenticatorInfo, MFAuthenticatorStatus } from "@padloc/core/src/mfa";
import { formatDate, formatDateFromNow } from "../lib/util";
import { until } from "lit/directives/until";
import { Button } from "./button";
import { SessionInfo } from "@padloc/core/src/session";
import { DeviceInfo } from "@padloc/core/src/platform";

@customElement("pl-settings-security")
export class SettingsSecurity extends StateMixin(Routing(LitElement)) {
    readonly routePattern = /^settings\/security/;

    @state()
    private _authInfo: Promise<AuthInfo> = Promise.resolve(new AuthInfo());

    @query("#addMFAButton")
    private _addMFAButton: Button;

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("change", () => this._updateSettings());
    }

    handleRoute() {
        if (this.active) {
            this._loadAuthInfo();
        }
    }

    private _loadAuthInfo() {
        if (!app.account) {
            return;
        }
        this._authInfo = app.api.getAuthInfo();
    }

    //* Opens the change password dialog and resets the corresponding input elements
    private async _changePassword() {
        const success = await prompt($l("Please enter your current password!"), {
            title: $l("Change Master Password"),
            label: $l("Enter Current Password"),
            type: "password",
            validate: async (pwd) => {
                try {
                    await app.account!.unlock(pwd);
                } catch (e) {
                    throw $l("Wrong password! Please try again!");
                }

                return pwd;
            },
        });

        if (!success) {
            return;
        }

        const newPwd = await prompt($l("Now choose a new master password!"), {
            title: $l("Change Master Password"),
            label: $l("Enter New Password"),
            type: "password",
            validate: async (val: string) => {
                if (val === "") {
                    throw $l("Please enter a password!");
                }
                return val;
            },
        });

        if (newPwd === null) {
            return;
        }

        const confirmed = await prompt($l("Please confirm your new password!"), {
            title: $l("Change Master Password"),
            label: $l("Repeat New Password"),
            type: "password",
            validate: async (pwd) => {
                if (pwd !== newPwd) {
                    throw "Wrong password! Please try again!";
                }

                return pwd;
            },
        });

        if (!confirmed) {
            return;
        }

        await app.changePassword(newPwd);
        alert($l("Master password changed successfully."), { type: "success" });
    }

    private async _toggleBiometricUnlock(e: Event) {
        // e.stopPropagation();
        const toggle = e.target as ToggleButton;
        if (toggle.active) {
            this.dispatchEvent(new CustomEvent("enable-biometric-auth", { bubbles: true, composed: true }));
        } else {
            const confirmed = await confirm(
                $l("Are you sure you want to disable biometric unlock?"),
                $l("Disable"),
                $l("Cancel"),
                { title: $l("Disable Biometric Unlock") }
            );
            if (confirmed) {
                await app.forgetMasterKey();
            } else {
                toggle.active = true;
            }
        }
    }

    private _updateSettings() {
        app.setSettings({
            autoLock: (this.renderRoot.querySelector("#autoLockButton") as ToggleButton).active,
            autoLockDelay: (this.renderRoot.querySelector("#autoLockDelaySlider") as Slider).value,
        });
    }

    private async _addMFAuthenticator() {
        const typeIndex = await choose(
            $l("What kind of multi-factor authenticator would you like to add?"),
            [
                html`
                    <pl-icon icon="usb" class="large horizontally-half-margined"></pl-icon>
                    <div class="left-padded text-left-aligning stretch">
                        <div>Hardware Key</div>
                        <div class="small subtle">Yubikey, Google Titan etc.</div>
                    </div>
                `,
                html`
                    <pl-icon icon="mail" class="large horizontally-half-margined"></pl-icon>
                    <div class="left-padded text-left-aligning stretch">
                        <div>OTP via Email</div>
                        <div class="small subtle">We'll send a code to your email.</div>
                    </div>
                `,
                html`
                    <pl-icon icon="totp" class="large horizontally-half-margined"></pl-icon>
                    <div class="left-padded text-left-aligning stretch">
                        <div>TOTP</div>
                        <div class="small subtle">Google Authenticator, Authy etc.</div>
                    </div>
                `,
                $l("Cancel"),
            ],
            { title: "New MFA-Method", icon: "key" }
        );
        const type = [MFAType.WebAuthn, MFAType.Email, MFAType.Totp][typeIndex];
        if (!type) {
            return;
        }
        this._addMFAButton.start();
        try {
            await registerAuthenticator([MFAPurpose.Login], type, {
                authenticatorSelection: { authenticatorAttachment: "cross-platform" },
            });
            this._loadAuthInfo();
        } catch (e) {
            alert(e.message, { type: "warning", title: $l("Failed to add authenticator") });
        }
        this._addMFAButton.stop();
    }

    private async _deleteMFAuthenticator({ id }: MFAuthenticatorInfo) {
        if (
            !(await confirm($l("Are you sure you want to delete this authenticator?"), $l("Delete"), $l("Cancel"), {
                type: "destructive",
                title: $l("Delete Authenticator"),
            }))
        ) {
            return;
        }
        await app.api.deleteMFAuthenticator(id);
        this._loadAuthInfo();
    }

    private async _revokeSession({ id }: SessionInfo) {
        if (
            !(await confirm($l("Are you sure you want to revoke this session?"), $l("Revoke"), $l("Cancel"), {
                type: "destructive",
                title: $l("Revoke Session"),
            }))
        ) {
            return;
        }
        await app.api.revokeSession(id);
        this._loadAuthInfo();
    }

    private async _removeTrustedDevice({ id }: DeviceInfo) {
        if (
            !(await confirm(
                $l("Are you sure you want to remove this device from your trusted devices?"),
                $l("Remove"),
                $l("Cancel"),
                {
                    type: "destructive",
                    title: $l("Remove Trusted Device"),
                }
            ))
        ) {
            return;
        }
        await app.api.removeTrustedDevice(id);
        this._loadAuthInfo();
    }

    private async _moveMFAuthenticator(authenticator: MFAuthenticatorInfo, direction: "up" | "down") {
        const authenticators = await this._getLoginAuthenticators();
        const i = authenticators.indexOf(authenticator);
        authenticators.splice(i, 1);
        authenticators.splice(direction === "up" ? i - 1 : i + 1, 0, authenticator);
        await app.api.updateAuth(
            new UpdateAuthParams({
                mfaOrder: authenticators.map((a) => a.id),
            })
        );
        this._loadAuthInfo();
    }

    private async _getLoginAuthenticators() {
        const { mfAuthenticators, mfaOrder } = await this._authInfo;
        return mfAuthenticators
            .filter((a) => a.purposes.includes(MFAPurpose.Login))
            .sort((a, b) => mfaOrder.indexOf(a.id) - mfaOrder.indexOf(b.id));
    }

    static styles = [shared];

    private async _renderAuthenticators() {
        const authenticators = await this._getLoginAuthenticators();
        return html`
            <pl-list>
                ${authenticators.map(
                    (a, i) => html`
                        <div class="padded horizontally-margined list-item center-aligning horizontal layout">
                            <pl-icon icon="${a.type === MFAType.Email ? "mail" : "usb"}" class="large"></pl-icon>
                            <div class="stretch horizontally-padded left-margined">
                                <div class="ellipsis">${a.description}</div>
                                <div class="tiny wrapping tags top-margined">
                                    ${
                                        a.status === MFAuthenticatorStatus.Requested
                                            ? html`<div class="tag warning">${$l("not activated")}</div>`
                                            : a.status === MFAuthenticatorStatus.Revoked
                                            ? html`<div class="tag warning">${$l("revoked")}</div>`
                                            : html`
                                                  <div
                                                      class="tag"
                                                      title="Last Used: ${a.lastUsed
                                                          ? formatDate(a.lastUsed)
                                                          : $l("never")}"
                                                  >
                                                      <pl-icon icon="time"></pl-icon> ${a.lastUsed
                                                          ? until(formatDateFromNow(a.lastUsed), "")
                                                          : $l("never")}
                                                  </div>
                                              `
                                    }
                                </div>
                                </div>
                                <pl-button
                                    class="slim transparent reveal-on-parent-hover"
                                    @click=${() => this._deleteMFAuthenticator(a)}
                                >
                                    <pl-icon icon="delete"></pl-icon>
                                </pl-button>
                                <div
                                    class="vertical layout reveal-on-parent-hover"
                                    ?hidden=${authenticators.length < 2}
                                >
                                    <pl-button
                                        class="transparent"
                                        style="display: flex; --button-padding: 0 0.3em;"
                                        ?disabled=${i === 0}
                                        @click=${() => this._moveMFAuthenticator(a, "up")}
                                    >
                                        <pl-icon icon="dropup"></pl-icon>
                                    </pl-button>
                                    <pl-button
                                        class="transparent"
                                        style="display: flex; --button-padding: 0 0.3em;"
                                        ?disabled=${i === authenticators.length - 1}
                                        @click=${() => this._moveMFAuthenticator(a, "down")}
                                    >
                                        <pl-icon icon="dropdown"></pl-icon>
                                    </pl-button>
                                </div>
                            </div>
                        </div>
                    `
                )}
            </pl-list>
        `;
    }

    private async _renderSessions() {
        const { sessions } = await this._authInfo;
        sessions.sort((a, b) => Number(b.lastUsed) - Number(a.lastUsed));
        return html`
            <pl-list>
                ${sessions.map((session) => {
                    const lastKnownLocation = !session.lastLocation
                        ? $l("Unknown")
                        : `${session.lastLocation.city || $l("Unknown City")}, ${
                              session.lastLocation.country || $l("Unknown Country")
                          }`;
                    return html`
                        <div class="padded horizontally-margined list-item center-aligning horizontal layout">
                            <pl-icon
                                icon="${["ios", "android"].includes(session.device?.platform.toLowerCase() || "")
                                    ? "mobile"
                                    : "desktop"}"
                                class="large"
                            ></pl-icon>
                            <div class="stretch horizontally-padded left-margined">
                                <div class="ellipsis">${session.device?.description || $l("Unknown Device")}</div>
                                <div class="tiny tags top-margined">
                                    ${session.id === app.session!.id
                                        ? html` <div class="tag highlight">
                                              <strong>${$l("Current Session")}</strong>
                                          </div>`
                                        : ""}
                                    <div class="tag" title="Last Active: ${formatDate(session.lastUsed)}">
                                        <pl-icon icon="time"></pl-icon> ${session.lastUsed
                                            ? until(formatDateFromNow(session.lastUsed), "")
                                            : $l("never")}
                                    </div>

                                    <div class="tag" title="Last Known Location: ${formatDate(session.lastUsed)}">
                                        <pl-icon icon="location"></pl-icon> ${lastKnownLocation}
                                    </div>
                                </div>
                            </div>
                            <pl-button
                                class="slim transparent reveal-on-parent-hover"
                                @click=${() => this._revokeSession(session)}
                                ?disabled=${session.id === app.session!.id}
                            >
                                <pl-icon icon="delete"></pl-icon>
                            </pl-button>
                        </div>
                    `;
                })}
            </pl-list>
        `;
    }

    private async _renderTrustedDevices() {
        const { trustedDevices, sessions } = await this._authInfo;
        return html`
            <pl-list>
                ${trustedDevices.map((device) => {
                    const latestSession = sessions
                        .filter((s) => s.device?.id === device.id)
                        .sort((a, b) => Number(b.lastUsed) - Number(a.lastUsed))[0];
                    const lastKnownLocation = !latestSession?.lastLocation
                        ? $l("Unknown")
                        : `${latestSession.lastLocation.city || $l("Unknown City")}, ${
                              latestSession.lastLocation.country || $l("Unknown Country")
                          }`;
                    return html`
                        <div class="padded horizontally-margined list-item center-aligning horizontal layout">
                            <pl-icon
                                icon="${["ios", "android"].includes(device.platform.toLowerCase() || "")
                                    ? "mobile"
                                    : "desktop"}"
                                class="large"
                            ></pl-icon>
                            <div class="stretch horizontally-padded left-margined">
                                <div class="ellipsis">${device.description || $l("Unknown Device")}</div>
                                <div class="tiny wrapping tags top-margined">
                                    ${device.id === app.state.device.id
                                        ? html` <div class="tag highlight">
                                              <strong>${$l("Current Device")}</strong>
                                          </div>`
                                        : ""}
                                    ${latestSession
                                        ? html`
                                              <div class="tag" title="Last Login: ${formatDate(latestSession.created)}">
                                                  <pl-icon icon="time"></pl-icon> ${latestSession.created
                                                      ? until(formatDateFromNow(latestSession.created), "")
                                                      : $l("never")}
                                              </div>

                                              <div class="tag" title="Last Known Location: ${lastKnownLocation}">
                                                  <pl-icon icon="location"></pl-icon> ${lastKnownLocation}
                                              </div>
                                          `
                                        : ""}
                                </div>
                            </div>
                            <pl-button
                                class="slim transparent reveal-on-parent-hover"
                                @click=${() => this._removeTrustedDevice(device)}
                            >
                                <pl-icon icon="delete"></pl-icon>
                            </pl-button>
                        </div>
                    `;
                })}
            </pl-list>
        `;
    }

    render() {
        return html`
            <div class="fullbleed vertical layout stretch background">
                <header class="padded center-aligning horizontal layout">
                    <pl-button class="transparent back-button" @click=${() => router.go("settings")}>
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>
                    <pl-icon icon="lock" class="left-margined vertically-padded wide-only"></pl-icon>
                    <div class="padded stretch ellipsis">${$l("Security")}</div>
                </header>

                <pl-scroller class="stretch">
                    <div class="wrapper padded spacing vertical layout">
                        <h2 class="large divider">${$l("Master Password")}</h2>

                        <pl-button @click=${() => this._changePassword()}> ${$l("Change Master Password")} </pl-button>

                        <h2 class="large divider top-margined top-padded">${$l("Auto Lock")}</h2>

                        <pl-toggle-button
                            id="autoLockButton"
                            .active=${app.settings.autoLock}
                            .label=${$l("Lock Automatically")}
                            reverse
                        >
                        </pl-toggle-button>

                        <pl-slider
                            id="autoLockDelaySlider"
                            min="1"
                            max="10"
                            step="1"
                            .value=${app.settings.autoLockDelay}
                            .unit=${$l(" min")}
                            .label=${$l("After")}
                            ?hidden=${!app.settings.autoLock}
                            class="item"
                        >
                        </pl-slider>

                        ${isWebAuthnSupported()
                            ? html`
                                  <h2 class="large divider top-margined top-padded">${$l("Biometric Unlock")}</h2>
                                  <pl-toggle-button
                                      id="biometricUnlockButton"
                                      .active=${live(app.remembersMasterKey)}
                                      .label=${$l("Enable Biometric Unlock")}
                                      reverse
                                      @change=${this._toggleBiometricUnlock}
                                  >
                                  </pl-toggle-button>
                              `
                            : ""}

                        <h2 class="large divider top-margined top-padded">${$l("Multi-Factor Authentication")}</h2>

                        ${until(
                            this._renderAuthenticators(),
                            html`
                                <div class="double-padded centering layout">
                                    <pl-spinner active></pl-spinner>
                                </div>
                            `
                        )}
                        <pl-button
                            id="addMFAButton"
                            class="small negatively-margined transparent"
                            style="align-self: center"
                            @click=${this._addMFAuthenticator}
                        >
                            <pl-icon icon="add" class="right-margined"></pl-icon>
                            <div>${$l("Add MFA Method")}</div>
                        </pl-button>

                        <h2 class="large divider top-margined top-padded">${$l("Active Sessions")}</h2>

                        ${until(
                            this._renderSessions(),
                            html`
                                <div class="double-padded centering layout">
                                    <pl-spinner active></pl-spinner>
                                </div>
                            `
                        )}

                        <h2 class="large divider top-margined top-padded">${$l("Trusted Devices")}</h2>

                        ${until(
                            this._renderTrustedDevices(),
                            html`
                                <div class="double-padded centering layout">
                                    <pl-spinner active></pl-spinner>
                                </div>
                            `
                        )}
                    </div>
                </pl-scroller>
            </div>
        `;
    }
}
