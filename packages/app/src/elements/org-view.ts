import { until } from "lit-html/directives/until";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { Invite } from "@padloc/core/lib/invite.js";
import { formatDateFromNow } from "../util.js";
import { shared, mixins } from "../styles";
import { dialog, prompt } from "../dialog.js";
import { app, router } from "../init.js";
import { BaseElement, element, html, property } from "./base.js";
import { Input } from "./input.js";
import { VaultDialog } from "./vault-dialog.js";
import "./toggle-button.js";
import "./account-item.js";
import "./icon.js";

@element("pl-org-view")
export class OrgView extends BaseElement {
    @property()
    selected: string = "";

    @dialog("pl-vault-dialog")
    private _vaultDialog: VaultDialog;

    private get _org() {
        return app.getOrg(this.selected);
    }

    @property()
    private _page: "members" | "groups" | "vaults" | "invites" = "members";

    private _createInvite() {
        prompt($l("Please enter the email address of the person you would like to invite!"), {
            type: "email",
            title: $l("Invite New Member"),
            label: $l("Email Address"),
            confirmLabel: $l("Send Invite"),
            validate: async (email: string, input: Input) => {
                if (input.invalid) {
                    throw $l("Please enter a valid email address!");
                }

                if ([...this._org!.members].some(m => m.email === email)) {
                    throw $l("This user is already a member!");
                }

                const invite = await app.createInvite(this._org!, email);
                router.go(`invite/${invite.org!.id}/${invite.id}`);

                return email;
            }
        });
    }

    private _showInvite(invite: Invite) {
        router.go(`invite/${invite.org!.id}/${invite.id}`);
    }

    private async _createVault() {
        const org = this._org!;

        await prompt($l("Please choose a vault name!"), {
            title: $l("Create Vault"),
            label: $l("Vault Name"),
            confirmLabel: $l("Create"),
            validate: async (name: string) => {
                if (!name) {
                    throw $l("Please enter a vault name!");
                }
                if (org.vaults.some(v => v.name === name)) {
                    throw $l("This organisation already has a vault with this name!");
                }
                await app.createVault(name, org);
                return name;
            }
        });
    }

    private async _showVault({ id }: { id: string }) {
        const vault = app.getVault(id) || (await app.api.getVault(id));
        this._vaultDialog.show(vault);
    }

    shouldUpdate() {
        return !!this._org;
    }

    render() {
        const org = this._org!;
        const isAdmin = org.isAdmin(app.account!);
        const invites = org.invites;
        const groups = [org.admins, org.everyone, ...org.groups];
        const vaults = org.vaults;

        return html`
            ${shared}

            <style>
                :host {
                    background: var(--color-tertiary);
                    display: flex;
                    flex-direction: column;
                }

                .tabs {
                    display: flex;
                }

                .tabs > * {
                    cursor: pointer;
                    margin-left: 15px;
                }

                .tabs > *[active] {
                    font-weight: bold;
                    color: var(--color-highlight);
                }

                .subview {
                    flex: 1;
                    position: relative;
                }

                .invite {
                    padding: 15px 17px;
                }

                .invite:hover {
                    background: #fafafa;
                }

                .invite .tags {
                    padding: 0;
                    margin: 0;
                }

                .invite-email {
                    font-weight: bold;
                    ${mixins.ellipsis()}
                    margin-bottom: 8px;
                }

                .invite-code {
                    text-align: center;
                }

                .invite-code-label {
                    font-weight: bold;
                    font-size: var(--font-size-micro);
                }

                .invite-code-value {
                    font-size: 140%;
                    font-family: var(--font-family-mono);
                    font-weight: bold;
                    text-transform: uppercase;
                    cursor: text;
                    user-select: text;
                    letter-spacing: 2px;
                }
            </style>

            <h1>${org.name}</h1>

            <div class="tabs">
                <div ?active=${this._page === "members"} @click=${() => (this._page = "members")}>${$l("Members")}</div>
                <div ?active=${this._page === "groups"} @click=${() => (this._page = "groups")}>${$l("Groups")}</div>
                <div ?active=${this._page === "vaults"} @click=${() => (this._page = "vaults")}>${$l("Vaults")}</div>
                <div ?active=${this._page === "invites"} @click=${() => (this._page = "invites")}>${$l("Invites")}</div>
            </div>

            <div ?hidden=${this._page !== "members"} class="subview">

                ${org.members.map(
                    member => html`
                        <div>
                            ${member.name}
                        </div>
                    `
                )}

                <div class="fabs" ?hidden=${!isAdmin}>
                    <div class="flex"></div>

                    <pl-icon icon="add" class="tap fab" @click=${() => this._createInvite()}></pl-icon>
                </div>
            </div>

            <div ?hidden=${this._page !== "groups"} class="subview">

                ${groups.map(
                    group => html`
                        <div>${group.name}</div>
                    `
                )}

                <div class="fabs" ?hidden=${!isAdmin}>
                    <div class="flex"></div>

                    <pl-icon icon="add" class="tap fab" @click=${() => {}}></pl-icon>
                </div>

            </div>

            <div ?hidden=${this._page !== "vaults"} class="subview">

                ${vaults.map(
                    vault => html`
                        <div @click=${() => this._showVault(vault)}>${vault.name}</div>
                    `
                )}

                <div class="fabs" ?hidden=${!isAdmin}>
                    <div class="flex"></div>

                    <pl-icon icon="add" class="tap fab" @click=${() => this._createVault()}></pl-icon>
                </div>

            </div>

            <div ?hidden=${this._page !== "invites"} class"subview">
                <ul>

                    ${invites.map(inv => {
                        const status = inv.expired
                            ? { icon: "time", class: "warning", text: $l("expired") }
                            : inv.accepted
                            ? { icon: "check", class: "highlight", text: $l("accepted") }
                            : {
                                  icon: "time",
                                  class: "",
                                  text: (async () => $l("expires {0}", await formatDateFromNow(inv.expires)))()
                              };

                        return html`
                            <li class="invite layout align-center tap animate" @click=${() => this._showInvite(inv)}>
                                <div flex>
                                    <div class="invite-email">${inv.email}</div>

                                    <div class="tags small">
                                        <div class="tag ${status.class}">
                                            <pl-icon icon="${status.icon}"></pl-icon>

                                            <div>${until(status.text)}</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="invite-code">
                                    <div class="invite-code-label">${$l("Confirmation Code:")}</div>

                                    <div class="invite-code-value">${inv.secret}</div>
                                </div>
                            </li>
                        `;
                    })}

                </ul>
            </div>
        `;
    }
}
