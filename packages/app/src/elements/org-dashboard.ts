import "./popover";
import "./org-nav";
import { translate as $l } from "@padloc/locale/src/translate";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { shared } from "../styles";
import { app } from "../globals";
import { dialog, alert } from "../lib/dialog";
import { CreateInvitesDialog } from "./create-invites-dialog";
import "./group-item";
import "./member-item";
import "./vault-item";
import "./invite-item";
import "./icon";
import "./scroller";
import "./list";
import { customElement, property } from "lit/decorators.js";
import { css, html, LitElement } from "lit";
import { ProvisioningStatus } from "@padloc/core/src/provisioning";
import "./rich-content";

@customElement("pl-org-dashboard")
export class OrgDashboard extends Routing(StateMixin(LitElement)) {
    readonly routePattern = /^orgs\/([^\/]+)\/dashboard/;

    @property()
    orgId: string = "";

    @dialog("pl-create-invites-dialog")
    private _createInvitesDialog: CreateInvitesDialog;

    private get _org() {
        return app.getOrg(this.orgId);
    }

    handleRoute([orgId]: [string, string]) {
        this.orgId = orgId;
    }

    private async _createInvite() {
        const invites = await this._createInvitesDialog.show(this._org!);
        if (invites) {
            if (invites.length === 1) {
                this.go(`orgs/${this.orgId}/invites/${invites[0].id}`);
            } else {
                alert($l("Successfully created {0} invites!", invites.length.toString()));
            }
        }
    }

    static styles = [
        shared,
        css`
            .sections {
                display: grid;
                grid-gap: 1em;
                margin: 1em;
                grid-template-columns: repeat(auto-fit, minmax(20em, 1fr));
            }

            @media (max-width: 700px) {
                .sections {
                    grid-template-columns: repeat(auto-fit, minmax(15em, 1fr));
                }
            }
        `,
    ];

    render() {
        if (!this._org || !this.app.account) {
            return;
        }

        const org = this._org!;
        const { status, quota, statusMessage } = app.getOrgProvisioning(org);

        return html`
            <div class="fullbleed vertical layout background">
                <header class="padded center-aligning horizontal layout">
                    <pl-org-nav></pl-org-nav>

                    <div class="stretch"></div>

                    <pl-button class="transparent">
                        <pl-icon icon="add"></pl-icon>
                    </pl-button>

                    <pl-popover hide-on-click alignment="bottom-left">
                        <div class="field-selector">
                            <pl-list>
                                <div
                                    class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                                    @click=${this._createInvite}
                                    ?disabled=${!org.isOwner(this.app.account)}
                                >
                                    <pl-icon icon="invite"></pl-icon>
                                    <div>New Member</div>
                                </div>
                                <div
                                    class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                                    @click=${() => this.go(`orgs/${this.orgId}/groups/new`)}
                                    ?hidden=${!org.groups.length && app.getOrgFeatures(org).addGroup.hidden}
                                >
                                    <pl-icon icon="group"></pl-icon>
                                    <div>New Group</div>
                                </div>
                                <div
                                    class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                                    @click=${() => this.go(`orgs/${this.orgId}/vaults/new`)}
                                >
                                    <pl-icon icon="vault"></pl-icon>
                                    <div>New Vault</div>
                                </div>
                            </pl-list>
                        </div>
                    </pl-popover>

                    <pl-button
                        class="transparent"
                        @click=${() => this.go(`orgs/${this.orgId}/settings`)}
                        ?disabled=${!org.isOwner(this.app.account)}
                    >
                        <pl-icon icon="settings"></pl-icon>
                    </pl-button>
                </header>

                <pl-scroller class="stretch">
                    <div class="sections">
                        ${status === ProvisioningStatus.Frozen
                            ? html`
                                  <section class="negative highlighted box vertical layout">
                                      <h2
                                          class="uppercase bg-dark border-bottom semibold center-aligning horizontal layout"
                                      >
                                          <pl-icon icon="frozen" class="left-margined"></pl-icon>
                                          <div class="padded">${$l("This org is frozen")}</div>
                                      </h2>
                                      <pl-rich-content
                                          class="padded block stretch"
                                          .content=${statusMessage}
                                          .type=${"markdown"}
                                      ></pl-rich-content>
                                      ${org.isOwner(app.account!)
                                          ? html`
                                                <pl-button
                                                    class="transparent half-margined"
                                                    @click=${() => this.go("settings/billing")}
                                                >
                                                    <div>Review Billing</div>
                                                    <pl-icon icon="arrow-right" class="left-margined"></pl-icon>
                                                </pl-button>
                                            `
                                          : ""}
                                  </section>
                              `
                            : ""}

                        <section class="box" ?hidden=${!org.invites.length || !org.isOwner(this.app.account!)}>
                            <h2
                                class="uppercase bg-dark border-bottom semibold center-aligning spacing horizontal layout"
                            >
                                <pl-icon icon="mail" class="left-margined"></pl-icon>
                                <div>${$l("Invites")}</div>
                                <div class="subtle bold">${org.invites.length}</div>
                                <div class="stretch"></div>
                                <pl-button
                                    class="skinny transparent half-margined"
                                    @click=${this._createInvite}
                                    ?disabled=${!org.isOwner(this.app.account)}
                                >
                                    <pl-icon icon="add"></pl-icon>
                                </pl-button>
                            </h2>
                            <pl-list>
                                ${org.invites.slice(0, 5).map(
                                    (invite) => html`
                                        <div
                                            class="padded list-item hover click"
                                            @click=${() => this.go(`orgs/${this.orgId}/invites/${invite.id}`)}
                                        >
                                            <pl-invite-item .invite=${invite}></pl-invite-item>
                                        </div>
                                    `
                                )}
                            </pl-list>
                            <pl-button
                                class="slim margined transparent"
                                @click=${() => this.go(`orgs/${this.orgId}/invites`)}
                                ?hidden=${org.invites.length < 6}
                            >
                                <div>${$l("Show All")}</div>
                                <pl-icon icon="arrow-right" class="small left-margined"></pl-icon>
                            </pl-button>
                        </section>

                        <section class="box">
                            <h2
                                class="uppercase bg-dark border-bottom semibold center-aligning spacing horizontal layout"
                            >
                                <pl-icon icon="members" class="left-margined"></pl-icon>
                                <div>${$l("Members")}</div>
                                <div
                                    class="${quota.members !== -1 && org.members.length > quota.members
                                        ? "negative highlight"
                                        : "subtle"}"
                                >
                                    <strong>${org.members.length}</strong>${quota.members !== -1
                                        ? ` / ${quota.members}`
                                        : ""}
                                </div>
                                <div class="stretch"></div>
                                <pl-button
                                    class="skinny transparent half-margined"
                                    @click=${this._createInvite}
                                    ?disabled=${!org.isOwner(this.app.account)}
                                >
                                    <pl-icon icon="add"></pl-icon>
                                </pl-button>
                            </h2>
                            <pl-list>
                                ${org.members.slice(0, 5).map(
                                    (member) => html`
                                        <div
                                            class="padded list-item hover click"
                                            @click=${() => this.go(`orgs/${this.orgId}/members/${member.id}`)}
                                        >
                                            <pl-member-item .member=${member} .org=${this._org!}></pl-member-item>
                                        </div>
                                    `
                                )}
                            </pl-list>
                            <pl-button
                                class="slim margined transparent"
                                @click=${() => this.go(`orgs/${this.orgId}/members`)}
                                ?hidden=${org.members.length < 6}
                            >
                                <div>${$l("Show All")}</div>
                                <pl-icon icon="arrow-right" class="small left-margined"></pl-icon>
                            </pl-button>
                        </section>

                        <section class="box" ?hidden=${quota?.groups === 0 && !org.groups.length}>
                            <h2
                                class="uppercase bg-dark border-bottom semibold center-aligning spacing horizontal layout"
                            >
                                <pl-icon icon="group" class="left-margined"></pl-icon>
                                <div>${$l("Groups")}</div>
                                <div
                                    class="${quota.groups !== -1 && org.groups.length > quota.groups
                                        ? "negative highlight"
                                        : "subtle"}"
                                >
                                    <strong>${org.groups.length}</strong>${quota.groups !== -1
                                        ? ` / ${quota.groups}`
                                        : ""}
                                </div>
                                <div class="stretch"></div>
                                <pl-button
                                    class="skinny transparent half-margined"
                                    @click=${() => this.go(`orgs/${this.orgId}/groups/new`)}
                                >
                                    <pl-icon icon="add"></pl-icon>
                                </pl-button>
                            </h2>
                            ${org.groups.length
                                ? html`
                                      <pl-list>
                                          ${org.groups.slice(0, 5).map(
                                              (group) => html`
                                                  <div
                                                      class="padded list-item hover click"
                                                      @click=${() =>
                                                          this.go(
                                                              `orgs/${this.orgId}/groups/${encodeURIComponent(
                                                                  group.name
                                                              )}`
                                                          )}
                                                  >
                                                      <pl-group-item .group=${group}></pl-group-item>
                                                  </div>
                                              `
                                          )}
                                      </pl-list>
                                      <pl-button
                                          class="slim margined transparent"
                                          @click=${() => this.go(`orgs/${this.orgId}/groups`)}
                                          ?hidden=${org.groups.length < 6}
                                      >
                                          <div>${$l("Show All")}</div>
                                          <pl-icon icon="arrow-right" class="small left-margined"></pl-icon>
                                      </pl-button>
                                  `
                                : html`
                                      <div class="double-padded small subtle">
                                          ${$l("This organization does not have any groups yet.")}
                                      </div>
                                      <pl-button
                                          class="slim margined transparent"
                                          @click=${() => this.go(`orgs/${this.orgId}/groups/new`)}
                                      >
                                          <pl-icon icon="add" class="small right-margined"></pl-icon>
                                          <div>${$l("Create Group")}</div>
                                      </pl-button>
                                  `}
                        </section>

                        <section class="box">
                            <h2
                                class="uppercase bg-dark border-bottom semibold center-aligning spacing horizontal layout"
                            >
                                <pl-icon icon="vaults" class="left-margined"></pl-icon>
                                <div>${$l("Vaults")}</div>
                                <div
                                    class="${quota.vaults !== -1 && org.vaults.length > quota.vaults
                                        ? "negative highlight"
                                        : "subtle"}"
                                >
                                    <strong>${org.vaults.length}</strong>${quota.vaults !== -1
                                        ? ` / ${quota.vaults}`
                                        : ""}
                                </div>
                                <div class="stretch"></div>
                                <pl-button
                                    class="skinny transparent half-margined"
                                    @click=${() => this.go(`orgs/${this.orgId}/vaults/new`)}
                                >
                                    <pl-icon icon="add"></pl-icon>
                                </pl-button>
                            </h2>
                            ${org.vaults.length
                                ? html`
                                      <pl-list>
                                          ${org.vaults.slice(0, 5).map(
                                              (vault) => html`
                                                  <div
                                                      class="padded list-item hover click"
                                                      @click=${() => this.go(`orgs/${this.orgId}/vaults/${vault.id}`)}
                                                  >
                                                      <pl-vault-item .vault=${vault} .org=${this._org}></pl-vault-item>
                                                  </div>
                                              `
                                          )}
                                      </pl-list>
                                      <pl-button
                                          class="slim margined transparent"
                                          @click=${() => this.go(`orgs/${this.orgId}/vaults`)}
                                          ?hidden=${org.vaults.length < 6}
                                      >
                                          <div>${$l("Show All")}</div>
                                          <pl-icon icon="arrow-right" class="small left-margined"></pl-icon>
                                      </pl-button>
                                  `
                                : html`
                                      <div class="double-padded small subtle">
                                          ${$l("This organization does not have any vaults yet.")}
                                      </div>
                                      <pl-button
                                          class="slim margined transparent"
                                          @click=${() => this.go(`orgs/${this.orgId}/vaults/new`)}
                                      >
                                          <pl-icon icon="add" class="small right-margined"></pl-icon>
                                          <div>${$l("Create Vault")}</div>
                                      </pl-button>
                                  `}
                        </section>
                    </div>
                </pl-scroller>
            </div>
        `;
    }
}
