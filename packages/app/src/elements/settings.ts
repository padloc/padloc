import "./settings-security";
import { translate as $l } from "@padloc/locale/src/translate";
import { BillingInfo } from "@padloc/core/src/billing";
import { composeEmail } from "@padloc/core/src/platform";
import { confirm, prompt, dialog } from "../lib/dialog";
import { app, router } from "../globals";
import { StateMixin } from "../mixins/state";
import { View } from "./view";
import "./icon";
import { ImportDialog } from "./import-dialog";
import { ExportDialog } from "./export-dialog";
import "./billing-info";
import "./randomart";
import "./subscription";
import "./scroller";
import "./button";
import "./list";
import { customElement, query, state } from "lit/decorators.js";
import { css, html } from "lit";
import { Select } from "./select";
import "./select";
import { Routing } from "../mixins/routing";

@customElement("pl-settings")
export class Settings extends StateMixin(Routing(View)) {
    readonly routePattern = /^settings(?:\/(\w+))?/;

    private readonly _pages = ["", "security", "general"];

    @state()
    private _page?: string;

    handleRoute([page]: [string]) {
        if (page && !this._pages.includes(page)) {
            this.redirect(`settings`);
            return;
        }

        this._page = page;
    }
    @query("input[type='file']")
    private _fileInput: HTMLInputElement;

    @dialog("pl-import-dialog")
    private _importDialog: ImportDialog;

    @dialog("pl-export-dialog")
    private _exportDialog: ExportDialog;

    shouldUpdate() {
        return !!app.account;
    }

    static styles = [
        ...View.styles,
        css`
            .wrapper {
                max-width: 30em;
                margin: 0 auto;
            }

            .menu {
                width: 15em;
                border-right: solid 1px var(--border-color);
            }

            pl-fingerprint {
                width: 3em;
                height: 3em;
                border-radius: 100%;
                border: solid 1px var(--border-color);
            }

            .selectable-list > :not(:last-child) {
                border-bottom: solid 1px var(--border-color);
            }
        `,
    ];

    render() {
        const { billingEnabled } = app;
        const account = app.account!;
        const billing = account.billing || new BillingInfo();

        return html`
            <div class="fullbleed pane layout ${this._page ? "open" : ""}">
                <div class="vertical layout menu">
                    <header class="padded spacing center-aligning horizontal layout">
                        <pl-button
                            class="transparent skinny"
                            @click=${() =>
                                this.dispatchEvent(new CustomEvent("toggle-menu", { composed: true, bubbles: true }))}
                        >
                            <div class="half-margined horizontal spacing center-aligning layout text-left-aligning">
                                <pl-icon icon="settings"></pl-icon>
                                <div class="stretch ellipsis">${$l("Settings")}</div>
                            </div>
                        </pl-button>
                    </header>
                    <pl-scroller class="stretch">
                        <nav>
                            <pl-list>
                                <div
                                    role="link"
                                    class="double-padded horizontally-margined list-item spacing center-aligning horizontal layout hover click"
                                    aria-selected=${this._page === "general"}
                                    @click=${() => this.go("settings/general")}
                                >
                                    <pl-icon icon="tools"></pl-icon>
                                    <div class="stretch ellipsis">${$l("General")}</div>
                                </div>
                                <div
                                    role="link"
                                    class="double-padded horizontally-margined list-item spacing center-aligning horizontal layout hover click"
                                    aria-selected=${this._page === "account"}
                                    @click=${() => this.go("settings/account")}
                                >
                                    <pl-icon icon="user"></pl-icon>
                                    <div class="stretch ellipsis">${$l("Account")}</div>
                                </div>
                                <div
                                    role="link"
                                    class="double-padded horizontally-margined list-item spacing center-aligning horizontal layout hover click"
                                    aria-selected=${this._page === "security"}
                                    @click=${() => this.go("settings/security")}
                                >
                                    <pl-icon icon="lock"></pl-icon>
                                    <div class="stretch ellipsis">${$l("Security")}</div>
                                </div>
                                <div
                                    role="link"
                                    class="double-padded horizontally-margined list-item spacing center-aligning horizontal layout hover click"
                                    aria-selected=${this._page === "display"}
                                    @click=${() => this.go("settings/display")}
                                >
                                    <pl-icon icon="display"></pl-icon>
                                    <div class="stretch ellipsis">${$l("Display")}</div>
                                </div>
                                <div
                                    role="link"
                                    class="double-padded horizontally-margined list-item spacing center-aligning horizontal layout hover click"
                                    aria-selected=${this._page === "billing"}
                                    @click=${() => this.go("settings/billing")}
                                >
                                    <pl-icon icon="billing"></pl-icon>
                                    <div class="stretch ellipsis">${$l("Billing & Plans")}</div>
                                </div>
                                <div
                                    role="link"
                                    class="double-padded horizontally-margined list-item spacing center-aligning horizontal layout hover click"
                                    aria-selected=${this._page === "about"}
                                    @click=${() => this.go("settings/about")}
                                >
                                    <pl-icon icon="info-round"></pl-icon>
                                    <div class="stretch ellipsis">${$l("About Padloc")}</div>
                                </div>
                            </pl-list>
                        </nav>
                    </pl-scroller>
                </div>

                <div class="stretch background relative">
                    <div class="fullbleed vertical layout" ?hidden=${this._page !== "general"}>
                        <header class="padded center-aligning horizontal layout">
                            <pl-button class="transparent back-button" @click=${() => router.go("settings")}>
                                <pl-icon icon="backward"></pl-icon>
                            </pl-button>
                            <div class="padded stretch ellipsis bold">${$l("General")}</div>
                        </header>

                        <pl-scroller class="stretch">
                            <div class="double-padded spacing vertical layout">
                                <h2 class="large divider">${$l("Profile")}</h2>

                                <div class="padded center-aligning spacing horizontal layout">
                                    <pl-fingerprint .key=${account.publicKey}></pl-fingerprint>

                                    <div class="stretch">
                                        <div>${account.name}</div>

                                        <div class="bold">${account.email}</div>
                                    </div>

                                    <pl-button class="round transparent" @click=${() => this._editAccount()}>
                                        <pl-icon icon="edit"></pl-icon>
                                    </pl-button>
                                </div>

                                <h2 class="large divider">${$l("Display")}</h2>

                                <pl-select
                                    .label=${$l("Theme")}
                                    .options=${["auto", "light", "dark"]}
                                    id="themeSelect"
                                    .selected=${app.settings.theme}
                                ></pl-select>

                                <h2 class="large divider">${$l("Security")}</h2>

                                <pl-button @click=${() => this._logout()}>${$l("Log Out")}</pl-button>

                                ${billingEnabled
                                    ? html`
                                          <h2 class="large divider">${$l("Subscription")}</h2>

                                          <pl-subscription></pl-subscription>

                                          <h2 class="large divider">${$l("Billing Info")}</h2>

                                          <pl-billing-info .billing=${billing}></pl-billing-info>
                                      `
                                    : html``}

                                <h2 class="large divider">${$l("Import / Export")}</h2>

                                <pl-button @click=${() => this._import()}>${$l("Import...")}</pl-button>

                                <pl-button @click=${() => this._export()}>${$l("Export...")}</pl-button>

                                <h2 class="large divider">${$l("Support")}</h2>

                                <pl-button @click=${() => this._openWebsite()}>${$l("Website")}</pl-button>

                                <pl-button @click=${() => this._sendMail()}>${$l("Contact Support")}</pl-button>

                                <h2 class="large divider">${$l("Danger Zone")}</h2>

                                <pl-button @click=${() => this._deleteAccount()} class="negative">
                                    ${$l("Delete Account")}
                                </pl-button>
                            </div>
                        </pl-scroller>
                    </div>

                    <pl-settings-security class="fullbleed" ?hidden=${this._page !== "security"}></pl-settings-security>
                </div>
            </div>

            <input type="file" accept="text/plain,.csv,.pls,.set,.pbes2" hidden @change=${() => this._importFile()} />
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("change", () => this._updateSettings());
    }

    private _updateSettings() {
        app.setSettings({
            theme: (this.renderRoot.querySelector("#themeSelect") as Select<"auto" | "light" | "dark">).selected,
        });
    }

    private _editAccount() {
        const account = app.account!;
        prompt("", {
            title: $l("Edit Profile"),
            confirmLabel: $l("Save"),
            value: account.name,
            label: $l("Name"),
            validate: async (name: string) => {
                if (!name) {
                    throw $l("Please enter a name!");
                }
                if (name !== account.name) {
                    await app.updateAccount(async (account) => (account.name = name));
                }
                return name;
            },
        });
    }

    private async _logout() {
        const confirmed = await confirm($l("Do you really want to log out?"), $l("Log Out"));
        if (confirmed) {
            await app.logout();
            router.go("login");
        }
    }

    private _openWebsite() {
        window.open("https://padloc.app", "_system");
    }

    private _sendMail() {
        const email = process.env.PL_SUPPORT_EMAIL || "";
        const subject = "Padloc Support Request";
        const message = `

----- enter your message above -----

NOTE: Below we have included some information about your device that may help
us analyse any problems you may be having. If you're not comfortable sharing
this data simply delete this of the email!

Device Info: ${JSON.stringify(app.state.device.toRaw(), null, 4)}
`;

        composeEmail(email, subject, message);
    }

    private async _import() {
        this._fileInput.click();
    }

    private async _importFile() {
        const file = this._fileInput.files![0];
        const reader = new FileReader();
        reader.onload = async () => {
            await this._importDialog.show(reader.result as string);
            this._fileInput.value = "";
        };

        reader.readAsText(file);
    }

    private _export() {
        this._exportDialog.show();
    }

    private async _deleteAccount() {
        const success = await prompt($l("Please enter your master password to proceed."), {
            title: $l("Delete Account"),
            label: $l("Enter Master Password"),
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

        const deleted = await prompt(
            $l(
                "Are you sure you want to delete this account? " +
                    "All associated vaults and the data within them will be lost and any active subscriptions will be canceled immediately. " +
                    "This action can not be undone!"
            ),
            {
                type: "destructive",
                title: $l("Delete Account"),
                confirmLabel: $l("Delete"),
                placeholder: $l("Type 'DELETE' to confirm"),
                validate: async (val) => {
                    if (val !== "DELETE") {
                        throw $l("Type 'DELETE' to confirm");
                    }

                    try {
                        await app.deleteAccount();
                    } catch (e) {
                        throw e.message || $l("Something went wrong. Please try again later!");
                    }

                    return val;
                },
            }
        );

        if (deleted) {
            router.go("");
        }
    }
}
