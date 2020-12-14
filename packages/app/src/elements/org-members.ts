import { translate as $l } from "@padloc/locale/src/translate";
import { Invite } from "@padloc/core/src/invite";
import { OrgMember, OrgRole } from "@padloc/core/src/org";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { dialog, alert, choose, confirm } from "../lib/dialog";
import { app } from "../globals";
import { shared } from "../styles";
import { BaseElement, element, html, property, query } from "./base";
import { Input } from "./input";
import { MemberDialog } from "./member-dialog";
import { CreateInvitesDialog } from "./create-invites-dialog";
import "./member-item";
import "./icon";
import "./scroller";
import "./select";

@element("pl-org-members")
export class OrgMembersView extends Routing(StateMixin(BaseElement)) {
    readonly routePattern = /^orgs\/([^\/]+)\/members(?:\/([^\/]+))?/;

    @property()
    orgId: string = "";

    @property()
    memberId?: string;

    @query("#filterMembersInput")
    private _filterMembersInput: Input;

    @dialog("pl-member-dialog")
    private _memberDialog: MemberDialog;

    @dialog("pl-create-invites-dialog")
    private _createInvitesDialog: CreateInvitesDialog;

    private get _org() {
        return app.getOrg(this.orgId);
    }

    @property()
    private _membersFilter: string = "";

    handleRoute([orgId, memberId]: [string, string]) {
        this.orgId = orgId;
        this.memberId = memberId;
    }

    private async _createInvite() {
        const invites = await this._createInvitesDialog.show(this._org!);
        if (invites) {
            if (invites.length === 1) {
                this.go(`invite/${invites[0].org!.id}/${invites[0].id}`);
            } else {
                alert($l("Successfully created {0} invites!", invites.length.toString()));
            }
        }
    }

    private _showInvite(invite: Invite) {
        this.go(`invite/${invite.org!.id}/${invite.id}`);
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

            const invite = org.invites.find((invite) => invite.email === member.email);

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
                                title: $l("Remove Member"),
                            }
                        );

                        if (confirmed) {
                            await app.removeMember(org, member);
                        }
                        break;
                    case 1:
                        const [invite] = await app.createInvites(org, [member.email], "confirm_membership");
                        this.go(`invite/${invite.org!.id}/${invite.id}`);
                        break;
                }
            }
        } else {
            await this._memberDialog.show({ org: org, member });
        }
    }

    private _clearMembersFilter() {
        this._membersFilter = this._filterMembersInput.value = "";
    }

    static styles = [shared];

    render() {
        if (!this._org) {
            return;
        }

        const org = this._org!;
        const isOwner = org.isOwner(app.account!);
        const invites = org.invites;
        const memFilter = this._membersFilter.toLowerCase();
        const members = memFilter
            ? org.members.filter(
                  ({ name, email }) => email.toLowerCase().includes(memFilter) || name.toLowerCase().includes(memFilter)
              )
            : org.members;

        return html`
            <div class="fullbleed pane layout background">
                <div class="vertical layout">
                    <header class="padded spacing center-aligning horizontal layout">
                        <pl-button
                            label="${$l("Menu")}"
                            class="transparent round narrow-only"
                            @click=${() => this.dispatch("toggle-menu")}
                        >
                            <pl-icon icon="menu"></pl-icon>
                        </pl-button>

                        <pl-select
                            class="transparent"
                            icon="members"
                            .label=${org.name}
                            .options=${[$l("Members")]}
                        ></pl-select>

                        <div class="stretch"></div>

                        <pl-button class="transparent slim" @click=${() => this._createInvite()}>
                            <pl-icon icon="add"></pl-icon>
                        </pl-button>
                    </header>

                    <pl-scroller class="stretch"> </pl-scroller>
                </div>

                <div>
                    ${org.frozen
                        ? html`
                              <div class="padded red inverted card">
                                  <div>
                                      ${$l(
                                          "This organization currently does not have an active subscription " +
                                              'and has been put in "frozen" state as a result. While in this state, ' +
                                              "you won't be able to make any changes to members, groups or vaults of this " +
                                              "organization."
                                      )}
                                  </div>
                                  <pl-button class="transparent" @click=${() => this.go(`orgs/${this.orgId}/settings`)}>
                                      ${$l("Update Subscription")}
                                  </pl-button>
                              </div>
                          `
                        : ""}

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
                            (inv) => html`
                                <li class="item tap" @click=${() => this._showInvite(inv)}>
                                    <pl-invite-item .invite=${inv}></pl-invite-item>
                                </li>
                            `
                        )}
                        ${members.map(
                            (member) => html`
                                <li class="tap member item" @click=${() => this._showMember(member)}>
                                    <pl-member-item .member=${member} .org=${this._org}></pl-member-item>
                                </li>
                            `
                        )}

                        <li class="new-button tap item" @click=${this._createInvite} ?hidden=${!isOwner}>
                            <pl-icon icon="add"></pl-icon>
                            <div>${$l("Invite New Members")}</div>
                        </li>
                    </ul>
                </div>
            </div>
        `;
    }
}
