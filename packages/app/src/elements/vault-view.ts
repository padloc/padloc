import { OrgMember } from "@padloc/core/src/org";
import { Vault } from "@padloc/core/src/vault";
import { translate as $l } from "@padloc/locale/src/translate";
import { shared } from "../styles";
import { app } from "../globals";
import { alert, prompt } from "../lib/dialog";
import { Routing } from "../mixins/routing";
import { StateMixin } from "../mixins/state";
import { Button } from "./button";
import "./icon";
import "./member-item";
import "./group-item";
import "./scroller";
import "./popover";
import "./list";
import { Input } from "./input";
import "./toggle";
import { customElement, property, query, state } from "lit/decorators.js";
import { css, html, LitElement } from "lit";

@customElement("pl-vault-view")
export class VaultView extends Routing(StateMixin(LitElement)) {
    readonly routePattern = /^orgs\/([^\/]+)\/vaults(?:\/([^\/]+))?/;

    @property()
    vaultId: string;

    @property()
    orgId: string;

    private get _org() {
        return app.getOrg(this.orgId);
    }

    private get _vault() {
        if (this.vaultId === "new") {
            return new Vault();
        }
        return this._org && this._org.vaults.find((v) => v.id === this.vaultId);
    }

    @query("#saveButton")
    private _saveButton: Button;

    @query("#nameInput")
    private _nameInput: Input;

    @state()
    private _groups: { name: string; readonly: boolean }[] = [];

    @state()
    private _members: { email: string; name: string; readonly: boolean }[] = [];

    private get _availableMembers() {
        return (
            (this._org && this._org.members.filter((member) => !this._members.some((m) => m.email === member.email))) ||
            []
        );
    }

    private get _availableGroups() {
        return (
            (this._org && this._org.groups.filter((group) => !this._groups.some((g) => g.name === group.name))) || []
        );
    }

    async handleRoute([orgId, vaultId]: [string, string]) {
        this.orgId = orgId;
        this.vaultId = vaultId;
        await this.updateComplete;
        this.clearChanges();
        if (vaultId === "new") {
            this._nameInput.focus();
            this._addMember(this._org?.getMember(app.account!)!);
        }
    }

    private _getCurrentGroups() {
        if (!this._org) {
            return [];
        }

        const groups: { name: string; readonly: boolean }[] = [];

        for (const group of this._org.groups) {
            const vault = group.vaults.find((v) => v.id === this.vaultId);
            if (vault) {
                groups.push({ name: group.name, readonly: vault.readonly });
            }
        }

        return groups;
    }

    private _getCurrentMembers() {
        if (!this._org) {
            return [];
        }

        const members: { email: string; name: string; readonly: boolean }[] = [];

        for (const member of this._org.members) {
            const vault = member.vaults.find((v) => v.id === this.vaultId);
            if (vault) {
                members.push({ email: member.email, name: member.name, readonly: vault.readonly });
            }
        }

        return members;
    }

    get hasChanges() {
        if (!this._org || !this._vault || !this._nameInput) {
            return false;
        }

        const hasNameChanged = this._nameInput.value !== this._vault!.name;

        const currentGroups = this._getCurrentGroups();
        const hasGroupsChanged =
            this._groups.length !== currentGroups.length ||
            this._groups.some((group) => {
                const other = currentGroups.find((g) => g.name === group.name);
                return !other || other.readonly !== group.readonly;
            });

        const currentMembers = this._getCurrentMembers();
        const hasMembersChanged =
            this._members.length !== currentMembers.length ||
            this._members.some((member) => {
                const other = currentMembers.find((m) => m.email === member.email);
                return !other || other.readonly !== member.readonly;
            });

        return hasNameChanged || hasGroupsChanged || hasMembersChanged;
    }

    async clearChanges(): Promise<void> {
        this._members = this._getCurrentMembers();
        this._groups = this._getCurrentGroups();
        this._nameInput && (this._nameInput.value = (this._vault && this._vault.name) || "");
    }

    private _cancel() {
        this.clearChanges();
        if (this.vaultId === "new") {
            this.go(`orgs/${this.orgId}/vaults`);
        }
    }

    private _addMember({ email, name }: OrgMember) {
        this._members.push({ email, name, readonly: false });
        this.requestUpdate();
    }

    private _addGroup(group: { name: string }) {
        this._groups.push({ name: group.name, readonly: false });
        this.requestUpdate();
    }

    private _removeMember(member: OrgMember) {
        this._members = this._members.filter((m) => m.email !== member.email);
    }

    private _removeGroup(group: { name: string }) {
        this._groups = this._groups.filter((g) => g.name !== group.name);
    }

    private async _save() {
        if (this._saveButton.state === "loading") {
            return;
        }

        if (!this._nameInput.value) {
            await alert($l("Please enter a Vault name!"), { title: $l("Vault name required!") });
            this._nameInput.focus();
            return;
        }

        if (this._nameInput.value.toLowerCase() === "new") {
            await alert($l("Please enter a different Vault name!"), { title: $l("Reserved Name!") });
            this._nameInput.focus();
            return;
        }

        if (!this._groups.length && !this._members.length) {
            await alert($l("Please assign at least one member or group to this vault!"));
            return;
        }

        this._saveButton.start();

        try {
            if (this.vaultId === "new") {
                const vault = await app.createVault(
                    this._nameInput.value,
                    this._org!,
                    [...this._members],
                    [...this._groups]
                );
                this.go(`orgs/${this._org!.id}/vaults/${vault.id}`, undefined, true, true);
            } else {
                await app.updateVaultAccess(
                    this.orgId,
                    this.vaultId,
                    this._nameInput.value,
                    [...this._members],
                    [...this._groups]
                );
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

    private async _removeVault() {
        const deleted = await prompt(
            $l(
                "Are you sure you want to delete this vault? " +
                    "All the data stored in it will be lost! " +
                    "This action can not be undone."
            ),
            {
                type: "destructive",
                title: $l("Delete Vault"),
                confirmLabel: $l("Delete"),
                placeholder: $l("Type 'DELETE' to confirm"),
                validate: async (val) => {
                    if (val !== "DELETE") {
                        throw $l("Type 'DELETE' to confirm");
                    }

                    await app.deleteVault(this.vaultId);

                    return val;
                },
            }
        );

        if (deleted) {
            alert($l("Vault deleted successfully!"), { title: $l("Delete Vault"), type: "success" });
            this.go(`orgs/${this.orgId}/vaults`);
        }
    }

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
        const vault = this._vault;

        if (!org || !vault) {
            return html`
                <div class="fullbleed centering double-padded text-centering vertical layout subtle">
                    <pl-icon icon="vault" class="enormous thin"></pl-icon>

                    <div>${$l("No vault selected.")}</div>
                </div>
            `;
        }

        const accountIsAdmin = org.isAdmin(app.account!);

        return html`
            <div class="fullbleed vertical layout">
                <header class="padded horizontal center-aligning layout">
                    <pl-button
                        class="transparent slim back-button"
                        @click=${() => this.go(`orgs/${this.orgId}/vaults`)}
                    >
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>

                    <pl-input
                        class="transparent large bold skinny stretch"
                        placeholder="Enter Vault Name"
                        id="nameInput"
                        @change=${() => this.requestUpdate()}
                        >${vault.name}</pl-input
                    >

                    <pl-button class="transparent left-margined" ?hidden=${!accountIsAdmin || this.vaultId === "new"}>
                        <pl-icon icon="more"></pl-icon>
                    </pl-button>

                    <pl-popover hide-on-click hide-on-leave>
                        <div
                            class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                            @click=${this._removeVault}
                        >
                            <pl-icon icon="delete"></pl-icon>
                            <div class="ellipsis">${$l("Delete")}</div>
                        </div>
                    </pl-popover>
                </header>

                <pl-scroller class="stretch">
                    <section class="double-margined box" ?hidden=${!org.groups.length}>
                        <h2 class="center-aligning horizontal layout bg-dark border-bottom">
                            <div class="padded uppercase stretch semibold">${$l("Groups")}</div>

                            <pl-button class="skinny half-margined transparent">
                                <pl-icon icon="add"></pl-icon>
                            </pl-button>

                            <pl-popover hide-on-leave .preferAlignment=${"bottom-left"} style="min-width: 15em;">
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
                        </h2>

                        <pl-list>
                            ${this._groups.length
                                ? this._groups.map((g) => {
                                      const group = org.groups.find((group) => group.name === g.name);
                                      if (!group) {
                                          return;
                                      }
                                      return html`
                                          <div class="padded list-item horizontal center-aligning layout">
                                              <pl-group-item .group=${group} class="stretch"></pl-group-item>
                                              <pl-button
                                                  class="small slim transparent reveal-on-parent-hover"
                                                  @click=${() => this._removeGroup(g)}
                                                  title=${$l("Remove Group")}
                                              >
                                                  <pl-icon icon="cancel"></pl-icon>
                                              </pl-button>
                                              <pl-button
                                                  .toggled=${!g.readonly}
                                                  @click=${() => {
                                                      g.readonly = !g.readonly;
                                                      this.requestUpdate();
                                                  }}
                                                  class="small slim transparent disable-toggle-styling"
                                                  title=${$l("Allow Editing")}
                                              >
                                                  <pl-icon class="right-margined" icon="edit"></pl-icon>
                                                  <pl-toggle class="small"></pl-toggle>
                                              </pl-button>
                                          </div>
                                      `;
                                  })
                                : html`<div class="double-padded small subtle">
                                      ${$l("No Groups have been given access to this vault yet.")}
                                  </div>`}
                        </pl-list>
                    </section>

                    <section class="double-margined box">
                        <h2 class="center-aligning horizontal layout bg-dark border-bottom">
                            <div class="padded uppercase stretch semibold">${$l("Members")}</div>
                            <pl-button class="skinny half-margined transparent">
                                <pl-icon icon="add"></pl-icon>
                            </pl-button>

                            <pl-popover hide-on-leave .preferAlignment=${"bottom-left"} style="min-width: 15em;">
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
                                                  title=${$l("Remove Member")}
                                              >
                                                  <pl-icon icon="cancel"></pl-icon>
                                              </pl-button>
                                              <pl-button
                                                  .toggled=${!m.readonly}
                                                  @click=${() => {
                                                      m.readonly = !m.readonly;
                                                      this.requestUpdate();
                                                  }}
                                                  class="small slim transparent disable-toggle-styling"
                                                  title=${$l("Allow Editing")}
                                              >
                                                  <pl-icon class="right-margined" icon="edit"></pl-icon>
                                                  <pl-toggle class="small"></pl-toggle>
                                              </pl-button>
                                          </div>
                                      `;
                                  })
                                : html`<div class="double-padded small subtle">
                                      ${$l("No Members have been given access to this vault yet.")}
                                  </div>`}
                        </pl-list>
                    </section>
                </pl-scroller>

                <div
                    class="padded horizontal spacing evenly stretching layout"
                    ?hidden=${this.vaultId !== "new" && !this.hasChanges}
                >
                    <pl-button
                        class="primary"
                        id="saveButton"
                        @click=${this._save}
                        ?disabled=${!this._nameInput?.value || (!this._members.length && !this._groups.length)}
                    >
                        ${$l("Save")}
                    </pl-button>

                    <pl-button @click=${this._cancel}> ${$l("Cancel")} </pl-button>
                </div>
            </div>
        `;
    }
}
