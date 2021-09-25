import "./popover";
import "./list";
import "./button";
import "./scroller";
import { html, LitElement } from "lit";
import { StateMixin } from "../mixins/state";
import { getMFAToken, registerMFAuthenticator, DeviceInfo } from "@padloc/core/src/platform";
import { app, router } from "../globals";
import { prompt, alert, confirm, choose } from "../lib/dialog";
import { translate as $l } from "@padloc/locale/src/translate";
import { live } from "lit/directives/live";
import { ToggleButton } from "./toggle-button";
import { customElement, query } from "lit/decorators.js";
import { shared } from "../styles";
import { Slider } from "./slider";
import { UpdateAuthParams } from "@padloc/core/src/api";
import { Routing } from "../mixins/routing";
import { AuthPurpose, AuthType, AuthenticatorInfo, AuthenticatorStatus } from "@padloc/core/src/auth";
import { formatDate, formatDateFromNow } from "../lib/util";
import { until } from "lit/directives/until";
import { Button } from "./button";
import { SessionInfo } from "@padloc/core/src/session";
import { KeyStoreEntryInfo } from "@padloc/core/src/key-store";
import { Toggle } from "./toggle";

@customElement("pl-settings-security")
export class SettingsSecurity extends StateMixin(Routing(LitElement)) {
    readonly routePattern = /^settings\/security/;

    @query("#addMFAButton")
    private _addMFAButton: Button;

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("change", () => this._updateSettings());
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
                $l("Are you sure you want to disable biometric unlock for this device?"),
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

    private async _addAuthenticator() {
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
        const type = [AuthType.WebAuthnPortable, AuthType.Email, AuthType.Totp][typeIndex];
        if (!type) {
            return;
        }
        this._addMFAButton.start();
        try {
            await registerMFAuthenticator({
                purposes: [AuthPurpose.Login],
                type,
            });
            app.fetchAuthInfo();
        } catch (e) {
            alert(e.message, { type: "warning", title: $l("Failed to add authenticator") });
        }
        this._addMFAButton.stop();
    }

    private async _deleteAuthenticator({ id }: AuthenticatorInfo) {
        if (
            !(await confirm($l("Are you sure you want to delete this authenticator?"), $l("Delete"), $l("Cancel"), {
                type: "destructive",
                title: $l("Delete Authenticator"),
            }))
        ) {
            return;
        }
        await app.api.deleteAuthenticator(id);
        app.fetchAuthInfo();
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
        app.fetchAuthInfo();
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
        app.fetchAuthInfo();
    }

    private async _moveAuthenticator(authenticator: AuthenticatorInfo, direction: "up" | "down") {
        const authenticators = await this._getLoginAuthenticators();
        const i = authenticators.indexOf(authenticator);
        authenticators.splice(i, 1);
        authenticators.splice(direction === "up" ? i - 1 : i + 1, 0, authenticator);
        await app.api.updateAuth(
            new UpdateAuthParams({
                mfaOrder: authenticators.map((a) => a.id),
            })
        );
        app.fetchAuthInfo();
    }

    private _getLoginAuthenticators() {
        if (!app.authInfo) {
            return [];
        }
        const { authenticators, mfaOrder } = app.authInfo;
        return authenticators
            .filter((a) => a.purposes.includes(AuthPurpose.Login))
            .sort((a, b) => mfaOrder.indexOf(a.id) - mfaOrder.indexOf(b.id));
    }

    private async _testMFAuthenticator(authenticator: AuthenticatorInfo) {
        try {
            const token = await getMFAToken({
                authenticatorId: authenticator.id,
                purpose: AuthPurpose.TestAuthenticator,
            });
            if (token) {
                alert($l("The test was successfull!"), { title: $l("Test Authenticator"), icon: "test" });
            } else {
                alert($l("Test failed!"), { title: $l("Test Authenticator") });
            }
        } catch (e) {
            alert($l("Test failed! Error: {0}", e.message), { title: $l("Test Authenticator") });
        }
    }

    private async _revokeBiometricUnlock(keyStore: KeyStoreEntryInfo, device?: DeviceInfo, e?: Event) {
        const toggle = e && (e.target as Toggle);
        if (
            !(await confirm(
                $l(
                    'Are you sure you want to revoke biometric unlock for the device "{0}"?',
                    device?.description || $l("Unknown Device")
                ),
                $l("Revoke"),
                $l("Cancel"),
                { title: $l("Revoke Biometric Unlock") }
            ))
        ) {
            if (toggle) {
                toggle.active = true;
                toggle.requestUpdate("active");
            }
            return;
        }

        await app.api.deleteKeyStoreEntry(keyStore.id);
        await app.api.deleteAuthenticator(keyStore.authenticatorId);
        await app.fetchAuthInfo();
    }

    static styles = [shared];

    private _renderAuthenticators() {
        const authenticators = this._getLoginAuthenticators();
        return html`
            <pl-list>
                ${authenticators.map(
                    (a, i) => html`
                        <div class="padded horizontally-margined list-item center-aligning horizontal layout">
                            <pl-icon
                                icon="${a.type === AuthType.Email ? "mail" : a.type === AuthType.Totp ? "time" : "usb"}"
                                class="large"
                            ></pl-icon>
                            <div class="stretch horizontally-padded left-margined">
                                <div class="ellipsis">${a.description}</div>
                                <div class="tiny wrapping tags top-margined">
                                    ${a.status === AuthenticatorStatus.Registering
                                        ? html`<div class="tag warning">${$l("not activated")}</div>`
                                        : a.status === AuthenticatorStatus.Revoked
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
                                          `}
                                </div>
                            </div>
                            <pl-button class="slim transparent reveal-on-parent-hover">
                                <pl-icon icon="more"></pl-icon>
                            </pl-button>
                            <pl-popover class="padded" hide-on-click>
                                <pl-list>
                                    <div
                                        class="padded horizontal spacing center-aligning layout list-item hover click"
                                        @click=${() => this._testMFAuthenticator(a)}
                                    >
                                        <pl-icon icon="test"></pl-icon>
                                        <div>${$l("Test")}</div>
                                    </div>
                                    <div
                                        class="padded horizontal spacing center-aligning layout list-item hover click"
                                        @click=${() => this._deleteAuthenticator(a)}
                                    >
                                        <pl-icon icon="delete"></pl-icon>
                                        <div>${$l("Remove")}</div>
                                    </div>
                                </pl-list>
                            </pl-popover>
                            <div class="vertical layout reveal-on-parent-hover" ?hidden=${authenticators.length < 2}>
                                <pl-button
                                    class="transparent"
                                    style="display: flex; --button-padding: 0 0.3em;"
                                    ?disabled=${i === 0}
                                    @click=${() => this._moveAuthenticator(a, "up")}
                                >
                                    <pl-icon icon="dropup"></pl-icon>
                                </pl-button>
                                <pl-button
                                    class="transparent"
                                    style="display: flex; --button-padding: 0 0.3em;"
                                    ?disabled=${i === authenticators.length - 1}
                                    @click=${() => this._moveAuthenticator(a, "down")}
                                >
                                    <pl-icon icon="dropdown"></pl-icon>
                                </pl-button>
                            </div>
                        </div>
                    `
                )}
            </pl-list>
        `;
    }

    private _renderSessions() {
        if (!app.authInfo || !app.session) {
            return;
        }
        const { sessions } = app.authInfo;
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

    private _renderTrustedDevices() {
        if (!app.authInfo) {
            return;
        }
        const { trustedDevices, sessions } = app.authInfo;
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

    private _renderBiometricUnlockDevices() {
        if (!app.authInfo) {
            return;
        }
        const { keyStoreEntries, authenticators } = app.authInfo;
        const currentDevice = app.state.device;
        const currentAuthenticator = authenticators.find((a) => a.device?.id === currentDevice.id);
        return html`
            <pl-list>
                <div class="padded horizontally-margined list-item center-aligning horizontal layout">
                    <pl-icon
                        icon="${["ios", "android"].includes(currentDevice.platform.toLowerCase() || "")
                            ? "mobile"
                            : "desktop"}"
                        class="large"
                    ></pl-icon>
                    <div class="stretch horizontally-padded left-margined">
                        <div class="ellipsis">${currentDevice.description || $l("Unknown Device")}</div>
                        <div class="tiny wrapping tags top-margined">
                            <div class="tag highlight">
                                <strong>${$l("Current Device")}</strong>
                            </div>
                            ${currentAuthenticator
                                ? html`
                                      <div
                                          class="tag"
                                          title="Last Used: ${currentAuthenticator.lastUsed
                                              ? formatDate(currentAuthenticator.lastUsed)
                                              : $l("never")}"
                                      >
                                          <pl-icon icon="time"></pl-icon> ${currentAuthenticator.lastUsed
                                              ? until(formatDateFromNow(currentAuthenticator.lastUsed), "")
                                              : $l("never")}
                                      </div>
                                  `
                                : ""}
                        </div>
                    </div>
                    <pl-toggle
                        .active=${live(app.remembersMasterKey)}
                        class="click"
                        @change=${(e: Event) => this._toggleBiometricUnlock(e)}
                    ></pl-toggle>
                </div>

                ${keyStoreEntries.map((entry) => {
                    const authenticator = authenticators.find((a) => a.id === entry.authenticatorId);
                    const device = authenticator?.device;
                    if (device?.id === app.state.device.id) {
                        return;
                    }
                    return html`
                        <div class="padded horizontally-margined list-item center-aligning horizontal layout">
                            <pl-icon
                                icon="${["ios", "android"].includes(device?.platform.toLowerCase() || "")
                                    ? "mobile"
                                    : "desktop"}"
                                class="large"
                            ></pl-icon>
                            <div class="stretch horizontally-padded left-margined">
                                <div class="ellipsis">${device?.description || $l("Unknown Device")}</div>
                                <div class="tiny wrapping tags top-margined">
                                    ${authenticator
                                        ? html`
                                              <div
                                                  class="tag"
                                                  title="Last Used: ${authenticator.lastUsed
                                                      ? formatDate(authenticator.lastUsed)
                                                      : $l("never")}"
                                              >
                                                  <pl-icon icon="time"></pl-icon> ${authenticator.lastUsed
                                                      ? until(formatDateFromNow(authenticator.lastUsed), "")
                                                      : $l("never")}
                                              </div>
                                          `
                                        : ""}
                                </div>
                            </div>
                            <pl-toggle
                                .active=${true}
                                class="click"
                                @change=${(e: Event) => this._revokeBiometricUnlock(entry, device, e)}
                            ></pl-toggle>
                            <!-- <pl-button
                                class="slim transparent reveal-on-parent-hover"
                                @click=${() => this._revokeBiometricUnlock(entry)}
                            >
                                <pl-icon icon="delete"></pl-icon>
                            </pl-button> -->
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

                        <h2 class="large divider top-margined top-padded">${$l("Biometric Unlock")}</h2>

                        ${this._renderBiometricUnlockDevices()}

                        <h2 class="large divider top-margined top-padded">${$l("Multi-Factor Authentication")}</h2>

                        ${this._renderAuthenticators()}
                        <pl-button
                            id="addMFAButton"
                            class="small negatively-margined transparent"
                            style="align-self: center"
                            @click=${this._addAuthenticator}
                        >
                            <pl-icon icon="add" class="right-margined"></pl-icon>
                            <div>${$l("Add MFA Method")}</div>
                        </pl-button>

                        <h2 class="large divider top-margined top-padded">${$l("Active Sessions")}</h2>

                        ${this._renderSessions()}

                        <h2 class="large divider top-margined top-padded">${$l("Trusted Devices")}</h2>

                        ${this._renderTrustedDevices()}
                    </div>
                </pl-scroller>
            </div>
        `;
    }
}
