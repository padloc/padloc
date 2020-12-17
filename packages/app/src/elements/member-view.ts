import { OrgRole, Group } from "@padloc/core/src/org";
import { translate as $l } from "@padloc/locale/src/translate";
import { mixins, shared } from "../styles";
import { app } from "../globals";
import { confirm, choose } from "../lib/dialog";
import { Routing } from "../mixins/routing";
import { StateMixin } from "../mixins/state";
import { BaseElement, element, html, css, property, query, observe } from "./base";
import { Button } from "./button";
import "./icon";
import "./group-item";
import "./member-item";
import "./vault-item";
import "./scroller";

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
    private _error: string = "";

    @property()
    private _vaults: { id: string; readonly: boolean }[] = [];

    @property()
    private _groups: string[] = [];

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
        this._error = "";
        this.requestUpdate();
    }

    private _removeGroup(group: Group) {
        this._groups = this._groups.filter((g) => g !== group.name);
    }

    // private _toggleVault({ id }: { id: VaultID }) {
    //     const { read } = this._vaults.get(id)!;
    //     this._vaults.set(id, read ? { read: false, write: false } : { read: true, write: true });
    //     this.requestUpdate();
    // }

    // private _toggleRead({ id }: { id: VaultID }, event?: Event) {
    //     if (event) {
    //         event.stopImmediatePropagation();
    //     }
    //
    //     const sel = this._vaults.get(id)!;
    //     sel.read = !sel.read;
    //     if (!sel.read) {
    //         sel.write = false;
    //     }
    //
    //     this.requestUpdate();
    // }
    //
    // private _toggleWrite({ id }: { id: VaultID }, event?: Event) {
    //     if (event) {
    //         event.stopImmediatePropagation();
    //     }
    //
    //     const sel = this._vaults.get(id)!;
    //     sel.write = !sel.write;
    //     if (sel.write) {
    //         sel.read = true;
    //     }
    //
    //     this.requestUpdate();
    // }

    private async _save() {
        if (this._saveButton.state === "loading") {
            return;
        }

        this._error = "";
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
            this._error = e.message || $l("Something went wrong. Please try again later!");
            throw e;
        }
    }

    private async _showOptions() {
        const isAdmin = this._member!.role === OrgRole.Admin;

        const choice = await choose(
            "",
            [$l("Remove"), $l("Suspend"), isAdmin ? $l("Remove Admin") : $l("Make Admin")],
            {
                hideIcon: true,
                type: "destructive",
            }
        );

        switch (choice) {
            case 0:
                this._removeMember();
                break;
            case 1:
                this._suspendMember();
                break;
            case 2:
                isAdmin ? this._removeAdmin() : this._makeAdmin();
                break;
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

    static styles = [
        shared,
        css`
            :host {
                position: relative;
            }

            .subheader {
                margin: 8px;
                font-weight: bold;
                display: flex;
                align-items: flex-end;
                padding: 0 8px;
                font-size: var(--font-size-small);
            }

            .subheader .permission {
                width: 50px;
                font-size: var(--font-size-tiny);
                text-align: center;
                ${mixins.ellipsis()}
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

        return html`
            <div class="fullbleed vertical layout">
                <header class="padded horizontal spacing center-aligning layout">
                    <div class="padded stretch">
                        <div class="bold">${member.name}</div>
                        <div>${member.email}</div>
                    </div>

                    <div class="small tags">
                        ${org.isOwner(member)
                            ? html` <div class="tag warning">${$l("Owner")}</div> `
                            : org.isAdmin(member)
                            ? html` <div class="tag highlight">${$l("Admin")}</div> `
                            : org.isSuspended(member)
                            ? html` <div class="tag warning">${$l("Suspended")}</div> `
                            : ""}
                    </div>

                    <pl-button class="transparent slim" ?hidden=${!accountIsOwner}>
                        <pl-icon icon="more" @click=${this._showOptions}></pl-icon>
                    </pl-button>
                </header>

                <pl-scroller class="stretch">
                    <section ?hidden=${!org.groups.length} class="double-margined">
                        <h3 class="vertically-margined center-aligning horizontal layout">
                            <div class="stretch">${$l("Groups")}</div>
                            <pl-button class="tiny slim transparent">
                                <pl-icon icon="add"></pl-icon>
                            </pl-button>
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
                        </h3>

                        <ul>
                            ${this._vaults.map(({ id, readonly }, i) => {
                                const vault = org.vaults.find((v) => v.id === id);
                                if (!vault) {
                                    return;
                                }
                                return html`
                                    <li class="padded ${i ? "border-top" : ""} horizontal center-aligning layout">
                                        <pl-vault-item .vault=${vault} class="stretch"></pl-vault-item>
                                        <pl-select
                                            .options=${["Read", "Read & Write"]}
                                            .value=${readonly ? "Read" : "Read & Write"}
                                            class="small transparent"
                                        ></pl-select>
                                    </li>
                                `;
                            })}
                        </ul>
                    </section>

                    <div class="error item" ?hidden="${!this._error}">${this._error}</div>
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
