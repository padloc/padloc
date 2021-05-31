import { OrgMember, Group } from "@padloc/core/src/org";
import { translate as $l } from "@padloc/locale/src/translate";
import { shared } from "../styles";
import { app } from "../globals";
import { alert, confirm } from "../lib/dialog";
import { Routing } from "../mixins/routing";
import { StateMixin } from "../mixins/state";
import { Button } from "./button";
import "./icon";
import "./member-item";
import "./vault-item";
import "./scroller";
import "./popover";
import "./list";
import { Input } from "./input";
import "./toggle";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

@customElement("pl-group-view")
export class GroupView extends Routing(StateMixin(LitElement)) {
    readonly routePattern = /^orgs\/([^\/]+)\/groups(?:\/([^\/]+))?/;

    @property()
    groupName: string;

    @property()
    orgId: string;

    private get _org() {
        return app.getOrg(this.orgId);
    }

    private get _group() {
        if (this.groupName === "new") {
            return new Group();
        }
        return this._org && this._org.groups.find((g) => g.name === this.groupName);
    }

    @query("#saveButton")
    private _saveButton: Button;

    @query("#nameInput")
    private _nameInput: Input;

    @state()
    private _vaults: { id: string; readonly: boolean }[] = [];

    @state()
    private _members: { id: string }[] = [];

    private get _availableMembers() {
        return (
            (this._org && this._org.members.filter((member) => !this._members.some((m) => m.id === member.id))) || []
        );
    }

    private get _availableVaults() {
        return (this._org && this._org.vaults.filter((vault) => !this._vaults.some((v) => v.id === vault.id))) || [];
    }

    async handleRoute([orgId, groupName]: [string, string]) {
        this.orgId = orgId;
        this.groupName = groupName && decodeURIComponent(groupName);
        await this.updateComplete;
        this.clearChanges();
        if (groupName === "new") {
            this._nameInput.focus();
        }
    }

    private _getCurrentVaults() {
        return (this._org && this._group && this._group.vaults.map((v) => ({ ...v }))) || [];
    }

    private _getCurrentMembers() {
        return (this._org && this._group && this._group.members.map((m) => ({ ...m }))) || [];
    }

    get hasChanges() {
        if (!this._org || !this._group || !this._nameInput) {
            return false;
        }

        const hasNameChanged = this._nameInput.value !== this._group!.name;

        const currentVaults = this._getCurrentVaults();
        const hasVaultsChanged =
            this._vaults.length !== currentVaults.length ||
            this._vaults.some((vault) => {
                const other = currentVaults.find((v) => v.id === vault.id);
                return !other || other.readonly !== vault.readonly;
            });

        const currentMembers = this._getCurrentMembers();
        const hasMembersChanged =
            this._members.length !== currentMembers.length ||
            this._members.some((member) => !currentMembers.some((m) => m.id === member.id));

        return hasNameChanged || hasVaultsChanged || hasMembersChanged;
    }

    clearChanges() {
        this._members = this._getCurrentMembers();
        this._vaults = this._getCurrentVaults();
        this._nameInput && (this._nameInput.value = (this._group && this._group.name) || "");
    }

    private _addMember({ id }: OrgMember) {
        this._members.push({ id });
        this.requestUpdate();
    }

    private _addVault(vault: { id: string; name: string }) {
        this._vaults.push({ id: vault.id, readonly: true });
        this.requestUpdate();
    }

    private _removeMember(member: OrgMember) {
        this._members = this._members.filter((m) => m.id !== member.id);
    }

    private _removeVault(vault: { id: string }) {
        this._vaults = this._vaults.filter((v) => v.id !== vault.id);
    }

    private async _save() {
        if (this._saveButton.state === "loading") {
            return;
        }

        if (!this._nameInput.value) {
            await alert($l("Please enter a Group name!"), { title: $l("Group name required!") });
            this._nameInput.focus();
            return;
        }

        this._saveButton.start();

        try {
            if (this.groupName === "new") {
                const group = await app.createGroup(
                    this._org!,
                    this._nameInput.value,
                    [...this._members],
                    [...this._vaults]
                );
                this.go(`orgs/${this._org!.id}/groups/${encodeURIComponent(group.name)}`, undefined, true, true);
            } else {
                const group = await app.updateGroup(
                    this._org!,
                    { name: this.groupName },
                    {
                        name: this._nameInput.value,
                        members: [...this._members],
                        vaults: [...this._vaults],
                    }
                );
                this.redirect(`orgs/${this._org!.id}/groups/${encodeURIComponent(group.name)}`);
            }

            this._saveButton.success();
            this.requestUpdate();
        } catch (e) {
            this._saveButton.fail();
            alert(typeof e === "string" ? e : e.message || $l("Something went wrong. Please try again later!"), {
                type: "warning",
            });
            throw e;
        }
    }

    private async _removeGroup() {
        const confirmed = await confirm(
            $l("Are you sure you want to remove this group from this organization?"),
            $l("Remove"),
            $l("Cancel"),
            {
                type: "destructive",
                title: $l("Remove Group"),
                icon: "delete",
            }
        );

        if (confirmed) {
            this._saveButton.start();

            try {
                await app.updateOrg(this._org!.id, async (org) => {
                    org.groups = org.groups.filter((group) => group.name !== this._group!.name);
                });
                this.go(`orgs/${this.orgId}/groups`);

                this._saveButton.success();
            } catch (e) {
                this._saveButton.fail();
                throw e;
            }
        }
    }

    private async _duplicateGroup() {
        const group = await app.createGroup(
            this._org!,
            `${this._group!.name} (copy)`,
            [...this._group!.members],
            [...this._group!.vaults]
        );
        this.go(`orgs/${this._org!.id}/groups/${group.name}`);
    }

    // private async _updateVaultPermissions(_vault: { id: string; readonly: boolean }, _e: Event) {
    //     // const select = e.target as Select<string>;
    // }

    static styles = [
        shared,
        css`
            :host {
                position: relative;
                background: var(--color-background);
            }
        `,
    ];

    render() {
        const org = this._org;
        const group = this._group;

        if (!org || !group) {
            return html` <div class="fullbleed centering layout">${$l("No group selected")}</div> `;
        }

        const accountIsAdmin = org.isAdmin(app.account!);

        return html`
            <div class="fullbleed vertical layout">
                <header class="padded horizontal center-aligning layout">
                    <pl-button class="transparent back-button" @click=${() => this.go(`orgs/${this.orgId}/groups`)}>
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>

                    <pl-input
                        class="transparent large bold skinny dashed stretch"
                        placeholder="Enter Group Name"
                        id="nameInput"
                        @change=${() => this.requestUpdate()}
                        >${group.name}</pl-input
                    >

                    <pl-button class="transparent left-margined" ?hidden=${!accountIsAdmin || this.groupName === "new"}>
                        <pl-icon icon="more"></pl-icon>
                    </pl-button>

                    <pl-popover class="padded" hide-on-click hide-on-leave alignment="left-bottom">
                        <pl-list>
                            <div
                                class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                                @click=${this._removeGroup}
                            >
                                <pl-icon icon="delete"></pl-icon>
                                <div>${$l("Delete")}</div>
                            </div>
                            <div
                                class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                                @click=${this._duplicateGroup}
                            >
                                <pl-icon icon="copy"></pl-icon>
                                <div>${$l("Duplicate")}</div>
                            </div>
                        </pl-list>
                    </pl-popover>
                </header>

                <pl-scroller class="stretch">
                    <section ?hidden=${!org.groups.length} class="double-margined">
                        <h2 class="center-aligning horizontal layout">
                            <div class="large stretch divider">${$l("Members")}</div>
                            <pl-button class="slim transparent">
                                <pl-icon icon="add"></pl-icon>
                            </pl-button>

                            <pl-popover class="tiny padded" hide-on-leave .preferAlignment=${"bottom-left"}>
                                ${this._availableMembers.length
                                    ? html`
                                          <pl-list>
                                              ${this._availableMembers.map(
                                                  (member) => html`
                                                      <div
                                                          class="padded center-aligning horizontal layout list-item hover click"
                                                          @click=${() => this._addMember(member)}
                                                      >
                                                          <pl-member-item
                                                              .member=${member}
                                                              class="stretch"
                                                              hide-info
                                                          ></pl-member-item>
                                                      </div>
                                                  `
                                              )}
                                          </pl-list>
                                      `
                                    : html`
                                          <div class="double-padded small subtle text-centering">
                                              ${$l("No more Members available")}
                                          </div>
                                      `}
                            </pl-popover>
                        </h2>

                        <pl-list>
                            ${this._members.length
                                ? this._members.map((m) => {
                                      const member = org.getMember(m);
                                      if (!member) {
                                          return;
                                      }
                                      return html`
                                          <div class="padded center-aligning horizontal layout list-item">
                                              <pl-member-item
                                                  .member=${member}
                                                  class="stretch"
                                                  hide-info
                                              ></pl-member-item>

                                              <pl-button
                                                  class="small slim transparent reveal-on-parent-hover"
                                                  @click=${() => this._removeMember(member)}
                                              >
                                                  <pl-icon icon="cancel"></pl-icon>
                                              </pl-button>
                                          </div>
                                      `;
                                  })
                                : html`
                                      <div class="double-padded small subtle">
                                          ${$l("This group does not have any members yet.")}
                                      </div>
                                  `}
                        </pl-list>
                    </section>

                    <section class="double-margined">
                        <h2 class="center-aligning horizontal layout">
                            <div class="large divider stretch">${$l("Vaults")}</div>

                            <pl-button class="slim transparent">
                                <pl-icon icon="add"></pl-icon>
                            </pl-button>

                            <pl-popover class="padded" hide-on-leave .preferAlignment=${"bottom-left"}>
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
                                              ${$l("No more Vaults available")}
                                          </div>
                                      `}
                            </pl-popover>
                        </h2>

                        <pl-list>
                            ${this._vaults.length
                                ? this._vaults.map((v) => {
                                      const vault = org.vaults.find((vault) => vault.id === v.id);
                                      if (!vault) {
                                          return;
                                      }
                                      return html`
                                          <div class="padded list-item horizontal center-aligning layout">
                                              <pl-vault-item .vault=${vault} class="stretch"></pl-vault-item>
                                              <pl-button
                                                  class="small slim transparent reveal-on-parent-hover"
                                                  @click=${() => this._removeVault(v)}
                                              >
                                                  <pl-icon icon="cancel"></pl-icon>
                                              </pl-button>
                                              <pl-button
                                                  .toggled=${!v.readonly}
                                                  @click=${() => {
                                                      v.readonly = !v.readonly;
                                                      this.requestUpdate();
                                                  }}
                                                  .label=${$l("Write Permission")}
                                                  class="small slim transparent disable-toggle-styling"
                                              >
                                                  <pl-icon class="right-margined" icon="edit"></pl-icon>
                                                  <pl-toggle class="small"></pl-toggle>
                                              </pl-button>
                                          </div>
                                      `;
                                  })
                                : html`
                                      <div class="double-padded small subtle">
                                          ${$l("This group does not have access to any vaults yet.")}
                                      </div>
                                  `}
                        </pl-list>
                    </section>
                </pl-scroller>

                <div class="padded horizontal spacing evenly stretching layout" ?hidden=${!this.hasChanges}>
                    <pl-button class="primary" id="saveButton" ?disabled=${!this.hasChanges} @click=${this._save}>
                        ${$l("Save")}
                    </pl-button>

                    <pl-button @click=${this.clearChanges}> ${this.hasChanges ? $l("Cancel") : $l("Close")} </pl-button>
                </div>
            </div>
        `;
    }
}
