import { localize as $l } from "@padloc/core/lib/locale.js";
import { Invite } from "@padloc/core/lib/invite.js";
import { OrgMember, OrgRole, Group } from "@padloc/core/lib/org.js";
import { BillingInfo } from "@padloc/core/lib/billing.js";
import { StateMixin } from "../mixins/state.js";
import { shared, mixins } from "../styles";
import { dialog, alert, choose, confirm, prompt } from "../dialog.js";
import { app, router } from "../init.js";
import { element, html, css, property, query, observe } from "./base.js";
import { View } from "./view.js";
import { Input } from "./input.js";
import { VaultDialog } from "./vault-dialog.js";
import { GroupDialog } from "./group-dialog.js";
import { MemberDialog } from "./member-dialog.js";
import { CreateInvitesDialog } from "./create-invites-dialog.js";
import "./billing-info.js";
import "./subscription.js";
import "./member-item.js";
import "./group-item.js";
import "./vault-item.js";
import "./invite-item.js";
import "./icon.js";

@element("pl-org-view")
export class OrgView extends StateMixin(View) {
    @property()
    orgId: string = "";

    @query("#filterMembersInput")
    private _filterMembersInput: Input;

    @dialog("pl-vault-dialog")
    private _vaultDialog: VaultDialog;

    @dialog("pl-group-dialog")
    private _groupDialog: GroupDialog;

    @dialog("pl-member-dialog")
    private _memberDialog: MemberDialog;

    @dialog("pl-create-invites-dialog")
    private _createInvitesDialog: CreateInvitesDialog;

    private get _org() {
        return app.getOrg(this.orgId);
    }

    @property()
    private _page: "members" | "groups" | "vaults" | "invites" | "settings" = "members";

    @property()
    private _membersFilter: string = "";

    private async _createInvite() {
        const invites = await this._createInvitesDialog.show(this._org!);
        if (invites) {
            if (invites.length === 1) {
                router.go(`invite/${invites[0].org!.id}/${invites[0].id}`);
            } else {
                alert($l("Successfully created {0} invites!", invites.length.toString()));
                this._page = "invites";
            }
        }
    }

    private _showInvite(invite: Invite) {
        router.go(`invite/${invite.org!.id}/${invite.id}`);
    }

    private async _createVault() {
        await this._vaultDialog.show({ org: this._org!, vault: null });
    }

    private async _showGroup(group: Group) {
        await this._groupDialog.show({ org: this._org!, group });
    }

    private async _createGroup() {
        await this._groupDialog.show({ org: this._org!, group: null });
    }

    private async _showVault(vault: { id: string; name: string }) {
        await this._vaultDialog.show({ org: this._org!, vault: vault });
    }

    private _updateMembersFilter() {
        this._membersFilter = this._filterMembersInput.value;
    }

    private async _showMember(member: OrgMember) {
        const org = this._org!;

        if (member.role === OrgRole.Suspended) {
            if (!org.isOwner(app.account!)) {
                return;
            }

            const invite = org.invites.find(invite => invite.email === member.email);

            if (invite) {
                this._showInvite(invite);
            } else {
                const choice = await choose("", [$l("Remove Member"), $l("Unsuspend")], { type: "destructive" });

                switch (choice) {
                    case 0:
                        const confirmed = await confirm(
                            $l("Are you sure you want to remove this member from this organization?"),
                            $l("Remove"),
                            $l("Cancel"),
                            {
                                type: "destructive",
                                title: $l("Remove Member")
                            }
                        );

                        if (confirmed) {
                            await app.removeMember(org, member);
                        }
                        break;
                    case 1:
                        const invite = await app.createInvites(org, [member.email], "confirm_membership")[0];
                        router.go(`invite/${invite.org!.id}/${invite.id}`);
                        break;
                }
            }
        } else {
            await this._memberDialog.show({ org: org, member });
        }
    }

    private async _deleteOrg() {
        const deleted = await prompt(
            $l(
                "Are you sure you want to delete this organization? " +
                    "All associated vaults the data within them will be lost! " +
                    "This action can not be undone."
            ),
            {
                type: "destructive",
                title: $l("Delete Organization"),
                confirmLabel: $l("Delete"),
                placeholder: $l("Type 'DELETE' to confirm"),
                validate: async val => {
                    if (val !== "DELETE") {
                        throw $l("Type 'DELETE' to confirm");
                    }

                    await app.deleteOrg(this._org!.id);

                    return val;
                }
            }
        );

        if (deleted) {
            router.go("");
        }
    }

    @observe("orgId")
    _clearMembersFilter() {
        this._membersFilter = this._filterMembersInput.value = "";
    }

    shouldUpdate() {
        return !!this._org;
    }

    static styles = [
        shared,
        css`
            :host {
                display: flex;
                flex-direction: column;
                background: var(--color-quaternary);
                border-radius: var(--border-radius);
            }

            .wrapper {
                position: relative;
                width: 100%;
                height: 100%;
                max-width: 500px;
                margin: 0 auto;
            }

            .subview {
                position: relative;
                ${mixins.fullbleed()}
                ${mixins.scroll()}
            }

            header {
                display: block;
                border: none;
            }

            .header-inner {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
            }

            .header-inner .title {
                text-align: center;
            }

            header > .tabs {
                margin: -10px;
            }

            .tabs .spacer {
                padding: 0;
            }

            .new-button {
                display: flex;
                font-weight: bold;
                align-items: center;
                justify-content: center;
                padding: 8px;
            }

            .new-button > pl-icon {
                font-size: 80%;
                width: 30px;
                height: 30px;
            }

            .settings {
                padding: 8px;
            }

            .settings > button,
            .settings > pl-loading-button {
                text-align: center;
                display: block;
                font-weight: bold;
            }

            .settings .item {
                margin: 8px 0;
            }

            .settings h3 {
                margin: 18px 8px 12px 8px;
                text-align: center;
            }

            .settings button {
                width: 100%;
            }
        `
    ];

    render() {
        const org = this._org!;
        const isOwner = org.isOwner(app.account!);
        const isAdmin = isOwner || org.isAdmin(app.account!);
        const invites = org.invites;
        const groups = org.groups;
        const vaults = org.vaults;
        const memFilter = this._membersFilter.toLowerCase();
        const members = memFilter
            ? org.members.filter(
                  ({ name, email }) => email.toLowerCase().includes(memFilter) || name.toLowerCase().includes(memFilter)
              )
            : org.members;

        const billing = org.billing || Object.assign(new BillingInfo(), { org: org.id });

        return html`
            <header>
                <div class="header-inner">
                    <pl-icon class="tap menu-button" icon="menu" @click=${() => this.dispatch("toggle-menu")}></pl-icon>
                    <div class="title flex ellipsis">${org.name}</div>
                    <pl-icon></pl-icon>
                </div>

                <div class="tabs">
                    <div class="spacer"></div>

                    <div class="tap" ?active=${this._page === "members"} @click=${() => (this._page = "members")}>
                        <pl-icon icon="members"></pl-icon>
                        <div>${$l("Members")}</div>
                    </div>

                    <div
                        class="tap"
                        ?active=${this._page === "groups"}
                        @click=${() => (this._page = "groups")}
                        ?hidden=${!org.groups.length && !org.quota.groups}
                    >
                        <pl-icon icon="group"></pl-icon>
                        <div>${$l("Groups")}</div>
                    </div>

                    <div class="tap" ?active=${this._page === "vaults"} @click=${() => (this._page = "vaults")}>
                        <pl-icon icon="vaults"></pl-icon>
                        <div>${$l("Vaults")}</div>
                    </div>

                    <div
                        class="tap"
                        ?active=${this._page === "settings"}
                        @click=${() => (this._page = "settings")}
                        ?hidden=${!isOwner}
                    >
                        <pl-icon icon="settings"></pl-icon>
                        <div>${$l("Settings")}</div>
                    </div>

                    <div class="spacer"></div>
                </div>
            </header>

            <main>
                <div class="wrapper">
                    <div ?hidden=${this._page !== "members"} class="subview">
                        <div class="search-wrapper item">
                            <pl-icon icon="search"></pl-icon>
                            <pl-input
                                id="filterMembersInput"
                                placeholder="${$l("Search...")}"
                                @input=${this._updateMembersFilter}
                            ></pl-input>
                            <pl-icon icon="cancel" class="tap" @click=${this._clearMembersFilter}></pl-icon>
                        </div>
                        <ul>
                            <li
                                class="new-button item tap"
                                @click=${this._createInvite}
                                ?hidden=${!isOwner || members.length < 50}
                            >
                                <pl-icon icon="invite"></pl-icon>
                                <div>${$l("Invite New Members")}</div>
                            </li>

                            ${invites.map(
                                inv => html`
                                    <li class="item tap" @click=${() => this._showInvite(inv)}>
                                        <pl-invite-item .invite=${inv}></pl-invite-item>
                                    </li>
                                `
                            )}
                            ${members.map(
                                member => html`
                                    <li class="tap member item" @click=${() => this._showMember(member)}>
                                        <pl-member-item .member=${member}></pl-member-item>
                                    </li>
                                `
                            )}

                            <li class="new-button tap item" @click=${this._createInvite} ?hidden=${!isOwner}>
                                <pl-icon icon="add"></pl-icon>
                                <div>${$l("Invite New Members")}</div>
                            </li>
                        </ul>
                    </div>

                    <div ?hidden=${this._page !== "groups"} class="subview">
                        <ul>
                            ${groups.map(
                                group => html`
                                    <li @click=${() => this._showGroup(group)} class="item tap">
                                        <pl-group-item .group=${group}></pl-group-item>
                                    </li>
                                `
                            )}
                            <li class="new-button tap item" @click=${this._createGroup} ?hidden=${!isAdmin}>
                                <pl-icon icon="add"></pl-icon>
                                <div>${$l("New Group")}</div>
                            </li>
                        </ul>
                    </div>

                    <div ?hidden=${this._page !== "vaults"} class="subview">
                        <ul>
                            ${vaults.map(
                                vault => html`
                                    <li @click=${() => this._showVault(vault)} class="item tap">
                                        <pl-vault-item
                                            .vault=${vault}
                                            .groups=${org.getGroupsForVault(vault).length}
                                            .members=${org.getMembersForVault(vault).length}
                                        ></pl-vault-item>
                                    </li>
                                `
                            )}
                            <li class="new-button tap item" @click=${this._createVault}>
                                <pl-icon icon="add"></pl-icon>
                                <div>${$l("New Vault")}</div>
                            </li>
                        </ul>
                    </div>

                    <div ?hidden=${this._page !== "settings" || !isOwner} class="subview settings">
                        <h3>${$l("Subscription")}</h3>

                        <pl-subscription .org=${this._org} class="item"></pl-subscription>

                        <h3>${$l("Billing Info")}</h3>

                        <pl-billing-info .billing=${billing} class="item"></pl-billing-info>

                        <h3>${$l("General")}</h3>

                        <button class="tap item">${$l("Change Organization Name")}</button>

                        <button class="item tap negative" @click=${this._deleteOrg}>
                            ${$l("Delete Organization")}
                        </button>
                    </div>
                </div>
            </main>
        `;
    }
}
