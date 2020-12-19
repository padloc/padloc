import { OrgRole, Group } from "@padloc/core/src/org";
import { translate as $l } from "@padloc/locale/src/translate";
import { shared } from "../styles";
import { app } from "../globals";
import { alert, confirm } from "../lib/dialog";
import { Routing } from "../mixins/routing";
import { StateMixin } from "../mixins/state";
import { BaseElement, element, html, css, property, query, observe } from "./base";
import { Button } from "./button";
import "./icon";
import "./group-item";
import "./member-item";
import "./vault-item";
import "./scroller";
import "./popover";
import "./list";

@element("pl-member-view")
export class MemberView extends Routing(StateMixin(BaseElement)) {
    readonly routePattern = /^orgs\/([^\/]+)\/members(?:\/([^\/]+))?/;

    @property()
    memberId: string;

    @property()
    orgId: string;

    private get _org() {
        return app.getOrg(this.orgId);
    }

    private get _member() {
        return this._org && this._org.getMember({ id: this.memberId });
    }

    @query("#saveButton")
    private _saveButton: Button;

    @property()
    private _vaults: { id: string; readonly: boolean }[] = [];

    private get _indirectVaults(): { id: string; readonly: boolean; groups: string[] }[] {
        let vaults: { id: string; readonly: boolean; groups: string[] }[] = [];

        for (const groupName of this._groups) {
            const group = this._org!.groups.find((g) => g.name === groupName)!;
            for (const vault of group.vaults) {
                if (this._vaults.some((v) => v.id === vault.id)) {
                    continue;
                }

                const existing = vaults.find((v) => v.id === vault.id);
                if (existing) {
                    existing.groups.push(group.name);
                    existing.readonly = existing.readonly && vault.readonly;
                } else {
                    vaults.push({
                        id: vault.id,
                        readonly: vault.readonly,
                        groups: [group.name],
                    });
                }
            }
        }

        return vaults;
    }

    @property()
    private _groups: string[] = [];

    private get _availableGroups() {
        return (this._org && this._org.groups.filter((g) => !this._groups.includes(g.name))) || [];
    }

    private get _availableVaults() {
        return (this._org && this._org.vaults.filter((vault) => !this._vaults.some((v) => v.id === vault.id))) || [];
    }

    handleRoute([orgId, memberId]: [string, string]) {
        this.orgId = orgId;
        this.memberId = memberId;
    }

    private _getCurrentVaults() {
        return (this._org && this._member && [...this._member.vaults]) || [];
    }

    private _getCurrentGroups() {
        return (this._org && this._member && this._org.getGroupsForMember(this._member).map((g) => g.name)) || [];
    }

    private get _hasChanged() {
        if (!this._org || !this._member) {
            return false;
        }

        const currentVaults = this._getCurrentVaults();
        const hasVaultsChanged =
            this._vaults.length !== currentVaults.length ||
            this._vaults.some((v) => !currentVaults.some((cv) => cv.id === v.id));

        const currentGroups = this._getCurrentGroups();
        const hasGroupsChanged =
            this._groups.length !== currentGroups.length || this._groups.some((g) => !currentGroups.includes(g));

        return hasVaultsChanged || hasGroupsChanged;
    }

    @observe("memberId")
    protected async _reset(): Promise<void> {
        this._groups = this._getCurrentGroups();
        this._vaults = this._getCurrentVaults();
        this.requestUpdate();
    }

    private _addGroup(group: Group) {
        this._groups.push(group.name);
        this.requestUpdate();
    }

    private _addVault(vault: { id: string; name: string }) {
        this._vaults.push({ id: vault.id, readonly: true });
        this.requestUpdate();
    }

    private _removeGroup(group: Group) {
        this._groups = this._groups.filter((g) => g !== group.name);
    }

    private _removeVault(vault: { id: string }) {
        this._vaults = this._vaults.filter((v) => v.id !== vault.id);
    }

    private async _save() {
        if (this._saveButton.state === "loading") {
            return;
        }

        this._saveButton.start();

        try {
            await app.updateMember(this._org!, this._member!, {
                vaults: [...this._vaults],
                groups: [...this._groups],
            });
            this._saveButton.success();
            this.requestUpdate();
        } catch (e) {
            this._saveButton.fail();
            alert(e.message || $l("Something went wrong. Please try again later!"), { type: "warning" });
            throw e;
        }
    }

    private async _removeMember() {
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
            this._saveButton.start();

            try {
                await app.removeMember(this._org!, this._member!);
                this.go(`orgs/${this.orgId}/members`);

                this._saveButton.success();
            } catch (e) {
                this._saveButton.fail();
                throw e;
            }
        }
    }

    private async _makeAdmin() {
        const confirmed = await confirm(
            $l(
                "Are you sure you want to make this member an admin? " +
                    "Admins can manage vaults, groups and permissions."
            ),
            $l("Make Admin"),
            $l("Cancel")
        );

        if (confirmed) {
            this._saveButton.start();

            try {
                await app.updateMember(this._org!, this._member!, { role: OrgRole.Admin });
                this._saveButton.success();
                this.requestUpdate();
            } catch (e) {
                this._saveButton.fail();
                throw e;
            }
        }
    }

    private async _removeAdmin() {
        const confirmed = await confirm(
            $l("Are you sure you want to remove this member as admin?"),
            $l("Remove Admin"),
            $l("Cancel"),
            { type: "destructive" }
        );

        if (confirmed) {
            this._saveButton.start();

            try {
                await app.updateMember(this._org!, this._member!, { role: OrgRole.Member });
                this._saveButton.success();
                this.requestUpdate();
            } catch (e) {
                this._saveButton.fail();
                throw e;
            }
        }
    }

    private async _suspendMember() {
        const confirmed = await confirm(
            $l("Are you sure you want to suspend this member?"),
            $l("Suspend Member"),
            $l("Cancel"),
            { type: "destructive" }
        );

        if (confirmed) {
            this._saveButton.start();

            try {
                await app.updateMember(this._org!, this._member!, { role: OrgRole.Suspended });
                this._saveButton.success();
                this.requestUpdate();
            } catch (e) {
                this._saveButton.fail();
                throw e;
            }
        }
    }

    private async _unsuspendMember() {
        const [invite] = await app.createInvites(this._org!, [this._member!.email], "confirm_membership");
        this.go(`invite/${invite.org!.id}/${invite.id}`);
    }

    static styles = [
        shared,
        css`
            :host {
                position: relative;
            }
        `,
    ];

    render() {
        const org = this._org;
        const member = this._member;

        if (!org || !member) {
            return;
        }

        const accountIsOwner = org.isOwner(app.account!);
        const accountIsAdmin = org.isAdmin(app.account!);
        const isAdmin = org.isAdmin(member);
        const isOwner = org.isOwner(member);
        const isSuspended = org.isSuspended(member);

        return html`
            <div class="fullbleed vertical layout">
                <header class="padded horizontal spacing center-aligning layout">
                    <div class="padded stretch">
                        <div class="bold">${member.name}</div>
                        <div>${member.email}</div>
                    </div>

                    <div class="small tags">
                        ${isOwner
                            ? html` <div class="tag warning">${$l("Owner")}</div> `
                            : isAdmin
                            ? html` <div class="tag highlight">${$l("Admin")}</div> `
                            : isSuspended
                            ? html` <div class="tag warning">${$l("Suspended")}</div> `
                            : ""}
                    </div>

                    <pl-button class="transparent slim" ?hidden=${!accountIsOwner}>
                        <pl-icon icon="more"></pl-icon>
                    </pl-button>

                    <pl-popover hide-on-click hide-on-leave>
                        <pl-button class="margined" @click=${this._removeMember} ?hidden=${isOwner}>
                            ${$l("Remove")}
                        </pl-button>
                        <pl-button class="margined" ?hidden=${isSuspended} @click=${this._suspendMember}>
                            ${$l("Suspend")}
                        </pl-button>
                        <pl-button class="margined" ?hidden=${!isSuspended} @click=${this._unsuspendMember}>
                            ${$l("Unsuspend")}
                        </pl-button>
                        <pl-button class="margined" ?hidden=${isAdmin} @click=${this._makeAdmin}>
                            ${$l("Make Admin")}
                        </pl-button>
                        <pl-button class="margined" ?hidden=${!isAdmin} @click=${this._removeAdmin}>
                            ${$l("Remove Admin")}
                        </pl-button>
                    </pl-popover>
                </header>

                <pl-scroller class="stretch">
                    <section ?hidden=${!org.groups.length} class="double-margined">
                        <h3 class="vertically-margined center-aligning horizontal layout">
                            <div class="stretch">${$l("Groups")}</div>
                            <pl-button class="tiny slim transparent">
                                <pl-icon icon="add"></pl-icon>
                            </pl-button>

                            <pl-popover class="tiny padded" hide-on-leave .preferAlignment=${"bottom-left"}>
                                ${this._availableGroups.length
                                    ? html`
                                          <pl-list>
                                              ${this._availableGroups.map(
                                                  (group) => html`
                                                      <div
                                                          class="padded center-aligning horizontal layout list-item hover click"
                                                          @click=${() => this._addGroup(group)}
                                                      >
                                                          <pl-group-item
                                                              .group=${group}
                                                              class="stretch"
                                                          ></pl-group-item>
                                                      </div>
                                                  `
                                              )}
                                          </pl-list>
                                      `
                                    : html`
                                          <div class="double-padded small subtle text-centering">
                                              ${$l("No more Groups available")}
                                          </div>
                                      `}
                            </pl-popover>
                        </h3>

                        <ul>
                            ${this._groups.map((name, i) => {
                                const group = org.getGroup(name);
                                if (!group) {
                                    return;
                                }
                                return html`
                                    <li class="padded center-aligning horizontal layout ${i ? "border-top" : ""}">
                                        <pl-group-item .group=${group} class="stretch"></pl-group-item>

                                        <pl-button
                                            class="small slim transparent reveal-on-parent-hover"
                                            @click=${() => this._removeGroup(group)}
                                        >
                                            ${$l("Remove")}
                                        </pl-button>
                                    </li>
                                `;
                            })}
                        </ul>
                    </section>

                    <section class="double-margined">
                        <h3 class="vertically-margined center-aligning horizontal layout">
                            <div class="stretch">${$l("Vaults")}</div>
                            <pl-button class="tiny slim transparent">
                                <pl-icon icon="add"></pl-icon>
                            </pl-button>

                            <pl-popover class="tiny padded" hide-on-leave .preferAlignment=${"bottom-left"}>
                                ${this._availableVaults.length
                                    ? html`
                                          <pl-list>
                                              ${this._availableVaults.map(
                                                  (vault) => html`
                                                      <div
                                                          class="padded center-aligning horizontal layout list-item hover click"
                                                          @click=${() => this._addVault(vault)}
                                                      >
                                                          <pl-vault-item
                                                              .vault=${vault}
                                                              class="stretch"
                                                          ></pl-vault-item>
                                                      </div>
                                                  `
                                              )}
                                          </pl-list>
                                      `
                                    : html`
                                          <div class="double-padded small subtle text-centering">
                                              ${$l("No more Vautls available")}
                                          </div>
                                      `}
                            </pl-popover>
                        </h3>

                        <ul>
                            ${this._vaults.map(({ id, readonly }) => {
                                const vault = org.vaults.find((v) => v.id === id);
                                if (!vault) {
                                    return;
                                }
                                return html`
                                    <li class="padded list-item horizontal spacing center-aligning layout">
                                        <pl-vault-item .vault=${vault} class="stretch"></pl-vault-item>
                                        <pl-button
                                            class="small slim transparent reveal-on-parent-hover"
                                            @click=${() => this._removeVault(vault)}
                                        >
                                            ${$l("Remove")}
                                        </pl-button>
                                        <pl-select
                                            .options=${["Read", "Write"]}
                                            .value=${readonly ? "Read" : "Write"}
                                            class="small transparent"
                                        ></pl-select>
                                    </li>
                                `;
                            })}
                            ${this._indirectVaults.map(({ id, readonly, groups }) => {
                                const vault = org.vaults.find((v) => v.id === id);
                                if (!vault) {
                                    return;
                                }
                                return html`
                                    <li class="padded list-item horizontal spacing center-aligning layout" disabled>
                                        <pl-vault-item .vault=${vault} class="stretch"></pl-vault-item>
                                        <div>
                                            <div class="subtle tiny">${$l("Via Groups")}</div>
                                            <div class="tiny tags">
                                                ${groups.map((g) => html`<div class="tag">${g}</div>`)}
                                            </div>
                                        </div>
                                        <pl-select
                                            .options=${["Read", "Write"]}
                                            .value=${readonly ? "Read" : "Write"}
                                            class="small transparent"
                                        ></pl-select>
                                    </li>
                                `;
                            })}
                        </ul>
                    </section>
                </pl-scroller>

                <div class="padded horizontal spacing evenly stretching layout" ?hidden=${!this._hasChanged}>
                    <pl-button
                        class="primary"
                        id="saveButton"
                        ?disabled=${!accountIsAdmin || !this._hasChanged}
                        @click=${this._save}
                    >
                        ${$l("Save")}
                    </pl-button>

                    <pl-button @click=${this._reset}> ${this._hasChanged ? $l("Cancel") : $l("Close")} </pl-button>
                </div>
            </div>
        `;
    }
}
