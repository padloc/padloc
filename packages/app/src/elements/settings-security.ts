import "./drawer";
import "./popover";
import "./list";
import "./button";
import "./scroller";
import { html, LitElement, TemplateResult } from "lit";
import { StateMixin } from "../mixins/state";
import {
    authenticate,
    registerAuthenticator,
    DeviceInfo,
    supportsPlatformAuthenticator,
    getPlatform,
} from "@padloc/core/src/platform";
import { app, router } from "../globals";
import { prompt, alert, confirm, choose } from "../lib/dialog";
import { translate as $l } from "@padloc/locale/src/translate";
import { live } from "lit/directives/live.js";
import { ToggleButton } from "./toggle-button";
import { customElement, query } from "lit/decorators.js";
import { shared } from "../styles";
import { Slider } from "./slider";
import { UpdateAuthParams } from "@padloc/core/src/api";
import { Routing } from "../mixins/routing";
import { AuthPurpose, AuthType, AuthenticatorInfo, AuthenticatorStatus } from "@padloc/core/src/auth";
import { formatDate, formatDateFromNow, passwordStrength } from "../lib/util";
import { until } from "lit/directives/until.js";
import { Button } from "./button";
import { SessionInfo } from "@padloc/core/src/session";
import { KeyStoreEntryInfo } from "@padloc/core/src/key-store";
import { Toggle } from "./toggle";
import { alertDisabledFeature } from "../lib/provisioning";
import { auditVaults } from "../lib/audit";
import "./icon";

@customElement("pl-settings-security")
export class SettingsSecurity extends StateMixin(Routing(LitElement)) {
    readonly routePattern = /^settings\/security/;

    @query("#addMFAButton")
    private _addMFAButton: Button;

    @query("#securityReportWeakToggle")
    private _securityReportWeakToggle: ToggleButton;

    @query("#securityReportReusedToggle")
    private _securityReportReusedToggle: ToggleButton;

    @query("#securityReportCompromisedToggle")
    private _securityReportCompromisedToggle: ToggleButton;

    @query("#securityReportExpiredToggle")
    private _securityReportExpiredToggle: ToggleButton;

    @query("#notificationsFailedLoginsToggle")
    private _notificationsFailedLoginsToggle: ToggleButton;

    @query("#notificationsNewLoginsToggle")
    private _notificationsNewLoginsToggle: ToggleButton;

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("change", () => this._updateSettings());
    }

    //* Opens the change password dialog and resets the corresponding input elements
    private async _changePassword(askForExisting = true): Promise<void> {
        const oldPassword =
            !askForExisting ||
            (await prompt($l("Please enter your current password!"), {
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
            }));

        if (!oldPassword) {
            return;
        }

        const newPassword = await prompt($l("Now choose a new master password!"), {
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

        const strength = await passwordStrength(newPassword);

        if (strength.score < 2) {
            const choice = await choose(
                $l(
                    "The password you entered is weak which makes it easier for attackers to break " +
                        "the encryption used to protect your data. Try to use a longer password or include a " +
                        "variation of uppercase, lowercase and special characters as well as numbers!"
                ),
                [$l("Choose Different Password"), $l("Use Anyway")],
                {
                    type: "warning",
                    title: $l("WARNING: Weak Password"),
                    icon: null,
                    preventDismiss: true,
                }
            );
            if (choice === 0) {
                return this._changePassword(false);
            }
        }

        if (newPassword === null) {
            return;
        }

        const confirmed = await prompt($l("Please confirm your new password!"), {
            title: $l("Change Master Password"),
            label: $l("Repeat New Password"),
            type: "password",
            validate: async (pwd) => {
                if (pwd !== newPassword) {
                    throw "Wrong password! Please try again!";
                }

                return pwd;
            },
        });

        if (!confirmed) {
            return;
        }

        await app.changePassword(oldPassword, newPassword);
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

    private async _updateSettings() {
        await app.setSettings({
            autoLock: (this.renderRoot.querySelector("#autoLockButton") as ToggleButton).active,
            autoLockDelay: (this.renderRoot.querySelector("#autoLockDelaySlider") as Slider).value,
        });
        await app.updateAccount(async (account) => {
            account.settings.securityReport.weakPasswords = this._securityReportWeakToggle.active;
            account.settings.securityReport.reusedPasswords = this._securityReportReusedToggle.active;
            account.settings.securityReport.compromisedPaswords = this._securityReportCompromisedToggle.active;
            account.settings.securityReport.expiredItems = this._securityReportExpiredToggle.active;
            account.settings.notifications.failedLoginAttempts = this._notificationsFailedLoginsToggle.active;
            account.settings.notifications.newLogins = this._notificationsNewLoginsToggle.active;
        });
        await auditVaults();
    }

    private async _addAuthenticator() {
        const feature = app.getAccountFeatures().manageAuthenticators;
        if (feature.disabled) {
            await alertDisabledFeature(feature);
            return;
        }

        const choices: {
            type?: AuthType;
            label: TemplateResult | string;
        }[] = [];
        const supportedAuthTypes = getPlatform().supportedAuthTypes;

        if (supportedAuthTypes.includes(AuthType.WebAuthnPortable)) {
            choices.push({
                type: AuthType.WebAuthnPortable,
                label: html`
                    <pl-icon icon="usb" class="large horizontally-half-margined"></pl-icon>
                    <div class="left-padded text-left-aligning stretch">
                        <div>Hardware Key</div>
                        <div class="small subtle">Yubikey, Google Titan etc.</div>
                    </div>
                `,
            });
        }

        // choices.push(
        //     html`
        //         <pl-icon icon="mail" class="large horizontally-half-margined"></pl-icon>
        //         <div class="left-padded text-left-aligning stretch">
        //             <div>OTP via Email</div>
        //             <div class="small subtle">We'll send a code to your email.</div>
        //         </div>
        //     `
        // );

        if (supportedAuthTypes.includes(AuthType.Totp)) {
            choices.push({
                type: AuthType.Totp,
                label: html`
                    <pl-icon icon="totp" class="large horizontally-half-margined"></pl-icon>
                    <div class="left-padded text-left-aligning stretch">
                        <div>TOTP</div>
                        <div class="small subtle">Google Authenticator, Authy etc.</div>
                    </div>
                `,
            });
        }

        choices.push({ label: $l("Cancel") });

        const typeIndex = await choose(
            $l("What kind of multi-factor authenticator would you like to add?"),
            choices.map((c) => c.label),
            {
                title: "New MFA-Method",
                icon: "key",
            }
        );
        const type = choices[typeIndex].type;
        if (!type) {
            return;
        }
        this._addMFAButton.start();
        try {
            await registerAuthenticator({
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
            const token = await authenticate({
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

    private _renderMFA() {
        if (app.getAccountFeatures().manageAuthenticators.hidden) {
            return;
        }

        const authenticators = this._getLoginAuthenticators();
        return html`
            <div class="box">
                <h2 class="padded uppercase bg-dark border-bottom semibold">${$l("Multi-Factor Authentication")}</h2>
                <pl-list>
                    ${authenticators.map(
                        (a, i) => html`
                            <div class="padded list-item center-aligning horizontal layout">
                                <pl-icon
                                    icon="${a.type === AuthType.Email
                                        ? "mail"
                                        : a.type === AuthType.Totp
                                        ? "time"
                                        : "usb"}"
                                    class="large"
                                ></pl-icon>
                                <div class="stretch collapse horizontally-padded left-margined">
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
                                                      <pl-icon icon="time" class="inline"></pl-icon> ${a.lastUsed
                                                          ? until(formatDateFromNow(a.lastUsed), "")
                                                          : $l("never")}
                                                  </div>
                                              `}
                                    </div>
                                </div>
                                <pl-button class="slim transparent reveal-on-parent-hover">
                                    <pl-icon icon="more"></pl-icon>
                                </pl-button>
                                <pl-popover hide-on-click>
                                    <pl-list>
                                        <div
                                            class="small double-padded horizontal spacing center-aligning layout list-item hover click"
                                            @click=${() => this._testMFAuthenticator(a)}
                                        >
                                            <pl-icon icon="test"></pl-icon>
                                            <div class="ellipsis">${$l("Test")}</div>
                                        </div>
                                        <div
                                            class="small double-padded horizontal spacing center-aligning layout list-item hover click"
                                            @click=${() => this._deleteAuthenticator(a)}
                                        >
                                            <pl-icon icon="delete"></pl-icon>
                                            <div class="ellipsis">${$l("Remove")}</div>
                                        </div>
                                    </pl-list>
                                </pl-popover>
                                <div
                                    class="vertical layout reveal-on-parent-hover"
                                    ?hidden=${authenticators.length < 2}
                                >
                                    <pl-button
                                        class="transparent"
                                        style="display: flex; --button-padding: 0 0.3em;"
                                        ?hidden=${i === 0}
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
                <div class="list-item">
                    <pl-button id="addMFAButton" class="transparent" @click=${this._addAuthenticator}>
                        <pl-icon icon="add" class="right-margined"></pl-icon>
                        <div>${$l("Add MFA Method")}</div>
                    </pl-button>
                </div>
            </div>
        `;
    }

    private _renderSessions() {
        if (!app.authInfo || !app.session || app.getAccountFeatures().manageSessions.hidden) {
            return;
        }
        const { sessions } = app.authInfo;
        sessions.sort((a, b) => Number(b.lastUsed) - Number(a.lastUsed));
        return html`
            <div class="box">
                <h2 class="padded bg-dark border-bottom center-aligning horizontal layout">
                    <div class="uppercase semibold">${$l("Active Sessions")}</div>
                    <div class="stretch"></div>
                    <pl-button class="subtle skinny transparent">
                        <pl-icon icon="info-round"></pl-icon>
                    </pl-button>
                    <pl-popover class="small double-padded max-width-20em">
                        ${$l(
                            "Active sessions indicate which devices or browsers are currently logged into your account. Note that sessions are not automatically revoked if you close or uninstall the Padloc app (or close the browser tab if you're using the web app). So it's possible that some devices that you haven't used Padloc on in a while still show up as active sessions. If you're unsure which device a session belongs to, simply revoke it."
                        )}
                    </pl-popover>
                </h2>
                <pl-list>
                    ${sessions.map((session) => {
                        const lastKnownLocation = !session.lastLocation
                            ? $l("Unknown")
                            : `${session.lastLocation.city || $l("Unknown City")}, ${
                                  session.lastLocation.country || $l("Unknown Country")
                              }`;
                        return html`
                            <div class="padded list-item center-aligning horizontal layout">
                                <pl-icon
                                    icon="${["ios", "android"].includes(session.device?.platform.toLowerCase() || "")
                                        ? "mobile"
                                        : "desktop"}"
                                    class="large"
                                ></pl-icon>
                                <div class="stretch collapse horizontally-padded left-margined">
                                    <div class="ellipsis">${session.device?.description || $l("Unknown Device")}</div>
                                    <div class="tiny tags top-margined">
                                        ${session.id === app.session!.id
                                            ? html` <div class="tag highlight">
                                                  <strong>${$l("Current Session")}</strong>
                                              </div>`
                                            : ""}
                                        <div class="tag" title="Last Active: ${formatDate(session.lastUsed)}">
                                            <pl-icon icon="time" class="inline"></pl-icon> ${session.lastUsed
                                                ? until(formatDateFromNow(session.lastUsed), "")
                                                : $l("never")}
                                        </div>

                                        <div class="tag" title="Last Known Location: ${lastKnownLocation}">
                                            <pl-icon icon="location" class="inline"></pl-icon> ${lastKnownLocation}
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
            </div>
        `;
    }

    private _renderTrustedDevices() {
        if (!app.authInfo || app.getAccountFeatures().manageDevices.hidden) {
            return;
        }
        const { trustedDevices, sessions } = app.authInfo;
        return html`
            <div class="box">
                <h2 class="padded bg-dark border-bottom center-aligning horizontal layout">
                    <div class="uppercase semibold">${$l("Trusted Devices")}</div>
                    <div class="stretch"></div>
                    <pl-button class="subtle skinny transparent">
                        <pl-icon icon="info-round"></pl-icon>
                    </pl-button>
                    <pl-popover class="small double-padded max-width-20em">
                        ${$l(
                            "Trusted devices are devices that are excluded from multi-factor authentication, which means that logging in from these devices will only require your email and master password. If you have lost or don't recognise any of these devices, please make sure to remove them."
                        )}
                    </pl-popover>
                </h2>
                ${trustedDevices.length
                    ? html`
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
                                      <div class="padded list-item center-aligning horizontal layout">
                                          <pl-icon
                                              icon="${["ios", "android"].includes(device.platform.toLowerCase() || "")
                                                  ? "mobile"
                                                  : "desktop"}"
                                              class="large"
                                          ></pl-icon>
                                          <div class="stretch collapse horizontally-padded left-margined">
                                              <div class="ellipsis">${device.description || $l("Unknown Device")}</div>
                                              <div class="tiny wrapping tags top-margined">
                                                  ${device.id === app.state.device.id
                                                      ? html` <div class="tag highlight">
                                                            <strong>${$l("Current Device")}</strong>
                                                        </div>`
                                                      : ""}
                                                  ${latestSession
                                                      ? html`
                                                            <div
                                                                class="tag"
                                                                title="Last Login: ${formatDate(latestSession.created)}"
                                                            >
                                                                <pl-icon icon="time" class="inline"></pl-icon>
                                                                ${latestSession.created
                                                                    ? until(
                                                                          formatDateFromNow(latestSession.created),
                                                                          ""
                                                                      )
                                                                    : $l("never")}
                                                            </div>

                                                            <div
                                                                class="tag"
                                                                title="Last Known Location: ${lastKnownLocation}"
                                                            >
                                                                <pl-icon icon="location" class="inline"></pl-icon>
                                                                ${lastKnownLocation}
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
                      `
                    : html`
                          <div class="double-padded small subtle">${$l("You don't have any trusted devices yet.")}</div>
                      `}
            </div>
        `;
    }

    private async _renderBiometricUnlockCurrentDevice(
        currentDevice: DeviceInfo,
        currentAuthenticator?: AuthenticatorInfo
    ) {
        const supportsPlatformAuth = await supportsPlatformAuthenticator();
        const isBioMetricUnlockSupported = Boolean(currentAuthenticator || supportsPlatformAuth);

        return html`
            <div class="padded list-item center-aligning horizontal layout" ?disabled=${!isBioMetricUnlockSupported}>
                <pl-icon
                    icon="${["ios", "android"].includes(currentDevice.platform.toLowerCase() || "")
                        ? "mobile"
                        : "desktop"}"
                    class="large"
                ></pl-icon>
                <div class="stretch collapse horizontally-padded left-margined">
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
                                      <pl-icon icon="time" class="inline"></pl-icon> ${currentAuthenticator.lastUsed
                                          ? until(formatDateFromNow(currentAuthenticator.lastUsed), "")
                                          : $l("never")}
                                  </div>
                              `
                            : supportsPlatformAuth
                            ? html`
                                  <div class="tag" title="Supported on this device.">
                                      <pl-icon icon="check" class="inline"></pl-icon> ${$l("Supported")}
                                  </div>
                              `
                            : html`
                                  <div class="tag" title="Not supported on this device.">
                                      <pl-icon icon="forbidden" class="inline"></pl-icon> ${$l("Not Supported")}
                                  </div>
                              `}
                    </div>
                </div>
                <pl-toggle
                    .active=${live(app.remembersMasterKey)}
                    class="click"
                    @change=${(e: Event) => this._toggleBiometricUnlock(e)}
                    ?notap=${!isBioMetricUnlockSupported}
                ></pl-toggle>
            </div>
        `;
    }

    private _renderBiometricUnlock() {
        if (!app.authInfo || app.getAccountFeatures().quickUnlock.hidden) {
            return;
        }
        const { keyStoreEntries, authenticators } = app.authInfo;
        const currentDevice = app.state.device;
        const currentAuthenticator = authenticators.find((a) => a.device?.id === currentDevice.id);
        return html`
            <div class="box">
                <h2 class="padded uppercase bg-dark border-bottom semibold">${$l("Biometric Unlock")}</h2>

                <pl-list>
                    ${until(this._renderBiometricUnlockCurrentDevice(currentDevice, currentAuthenticator), "")}
                    ${keyStoreEntries.map((entry) => {
                        const authenticator = authenticators.find((a) => a.id === entry.authenticatorId);
                        const device = authenticator?.device;
                        if (device?.id === app.state.device.id) {
                            return;
                        }
                        return html`
                            <div class="padded list-item center-aligning horizontal layout">
                                <pl-icon
                                    icon="${["ios", "android"].includes(device?.platform.toLowerCase() || "")
                                        ? "mobile"
                                        : "desktop"}"
                                    class="large"
                                ></pl-icon>
                                <div class="stretch collapse horizontally-padded left-margined">
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
                                                      <pl-icon icon="time" class="inline"></pl-icon>
                                                      ${authenticator.lastUsed
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
            </div>
        `;
    }

    private _renderSecurityReport() {
        return html`
            <div class="box">
                <h2 class="padded uppercase bg-dark border-bottom semibold">${$l("Security Report")}</h2>

                <div>
                    <pl-toggle-button
                        class="transparent"
                        id="securityReportWeakToggle"
                        .active=${app.account?.settings.securityReport.weakPasswords || false}
                        .label=${html`<div class="horizontal center-aligning spacing layout">
                            <pl-icon icon="weak"></pl-icon>
                            <div>${$l("Weak Passwords")}</div>
                        </div>`}
                        reverse
                    >
                    </pl-toggle-button>
                </div>

                <div class="border-top">
                    <pl-toggle-button
                        class="transparent"
                        id="securityReportReusedToggle"
                        .active=${app.account?.settings.securityReport.reusedPasswords || false}
                        .label=${html`<div class="horizontal center-aligning spacing layout">
                            <pl-icon icon="reused"></pl-icon>
                            <div>${$l("Reused Passwords")}</div>
                        </div>`}
                        reverse
                    >
                    </pl-toggle-button>
                </div>

                <div class="border-top">
                    <pl-toggle-button
                        class="transparent"
                        id="securityReportCompromisedToggle"
                        .active=${app.account?.settings.securityReport.compromisedPaswords || false}
                        .label=${html`<div class="horizontal center-aligning spacing layout">
                            <pl-icon icon="compromised"></pl-icon>
                            <div>${$l("Compromised Passwords")}</div>
                        </div>`}
                        reverse
                    >
                    </pl-toggle-button>
                </div>

                <div class="border-top">
                    <pl-toggle-button
                        class="transparent"
                        id="securityReportExpiredToggle"
                        .active=${app.account?.settings.securityReport.expiredItems || false}
                        .label=${html`<div class="horizontal center-aligning spacing layout">
                            <pl-icon icon="expired"></pl-icon>
                            <div>${$l("Expiring or Expired Items")}</div>
                        </div>`}
                        reverse
                    >
                    </pl-toggle-button>
                </div>
            </div>
        `;
    }

    private _renderEmailNotifications() {
        return html`
            <div class="box">
                <h2 class="padded uppercase bg-dark border-bottom semibold">${$l("Email Notifications")}</h2>

                <div>
                    <pl-toggle-button
                        class="transparent"
                        id="notificationsFailedLoginsToggle"
                        .active=${app.account?.settings.notifications.failedLoginAttempts || false}
                        .label=${html`<div class="horizontal center-aligning spacing layout">
                            <pl-icon icon="forbidden"></pl-icon>
                            <div>${$l("Failed Login Attempts")}</div>
                        </div>`}
                        reverse
                    >
                    </pl-toggle-button>
                </div>

                <div class="border-top">
                    <pl-toggle-button
                        class="transparent"
                        id="notificationsNewLoginsToggle"
                        .active=${app.account?.settings.notifications.newLogins || false}
                        .label=${html`<div class="horizontal center-aligning spacing layout">
                            <pl-icon icon="unlock"></pl-icon>
                            <div>${$l("New Logins (on new or untrusted devices)")}</div>
                        </div>`}
                        reverse
                    >
                    </pl-toggle-button>
                </div>
            </div>
        `;
    }

    render() {
        return html`
            <div class="fullbleed vertical layout stretch background">
                <header class="padded center-aligning horizontal layout">
                    <pl-button class="transparent slim back-button" @click=${() => router.go("settings")}>
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>
                    <pl-icon icon="lock" class="left-margined vertically-padded wide-only"></pl-icon>
                    <div class="padded stretch ellipsis">${$l("Security")}</div>
                </header>

                <pl-scroller class="stretch">
                    <div class="wrapper double-padded double-spacing vertical layout">
                        <div class="box">
                            <h2 class="padded uppercase bg-dark border-bottom semibold">${$l("Master Password")}</h2>

                            <pl-button class="transparent" @click=${() => this._changePassword()}>
                                ${$l("Change Master Password")}
                            </pl-button>
                        </div>

                        <div class="box">
                            <h2 class="padded uppercase bg-dark border-bottom semibold">${$l("Auto Lock")}</h2>

                            <div>
                                <pl-toggle-button
                                    class="transparent"
                                    id="autoLockButton"
                                    .active=${app.settings.autoLock}
                                    .label=${$l("Lock Automatically")}
                                    reverse
                                >
                                </pl-toggle-button>
                            </div>

                            <pl-drawer .collapsed=${!app.settings.autoLock}>
                                <div class="half-padded border-top">
                                    <pl-slider
                                        id="autoLockDelaySlider"
                                        min="${["ios", "android"].includes(
                                            app.state.device.platform.toLowerCase() || ""
                                        )
                                            ? "0"
                                            : "1"}"
                                        max="10"
                                        step="1"
                                        .value=${app.settings.autoLockDelay}
                                        .unit=${$l(" min")}
                                        .label=${$l("After")}
                                        class="item"
                                    >
                                    </pl-slider>
                                </div>
                            </pl-drawer>
                        </div>

                        ${this._renderBiometricUnlock()} ${this._renderMFA()} ${this._renderSessions()}
                        ${this._renderTrustedDevices()} ${this._renderSecurityReport()}
                        ${this._renderEmailNotifications()}
                    </div>
                </pl-scroller>
            </div>
        `;
    }
}
