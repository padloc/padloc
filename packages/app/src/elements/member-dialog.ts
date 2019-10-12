import { Org, OrgMember, OrgRole, Group } from "@padloc/core/src/org";
import { VaultID } from "@padloc/core/src/vault";
import { translate as $l } from "@padloc/locale/src/translate";
import { mixins } from "../styles";
import { app } from "../globals";
import { confirm, choose } from "../lib/dialog";
import { element, html, css, property, query } from "./base";
import { Dialog } from "./dialog";
import { LoadingButton } from "./loading-button";
import "./icon";
import "./toggle-button";
import "./group-item";
import "./member-item";
import "./vault-item";

type InputType = { member: OrgMember; org: Org };

@element("pl-member-dialog")
export class MemberDialog extends Dialog<InputType, void> {
    @property()
    org: Org | null = null;

    @property()
    member: OrgMember | null = null;

    @query("#saveButton")
    private _saveButton: LoadingButton;

    @property()
    private _error: string = "";

    private _vaults = new Map<string, { read: boolean; write: boolean }>();
    private _groups = new Set<string>();

    private _getCurrentVaults(): Map<string, { read: boolean; write: boolean }> {
        const vaults = new Map<string, { read: boolean; write: boolean }>();

        if (!this.org || !this.member) {
            return vaults;
        }

        for (const vault of this.org.vaults) {
            const v = this.member && this.member.vaults.find(v => v.id === vault!.id);
            vaults.set(vault.id, {
                read: !!v,
                write: !!v && !v.readonly
            });
        }

        return vaults;
    }

    private _getCurrentGroups() {
        return this.org && this.member
            ? new Set(this.org.getGroupsForMember(this.member).map(g => g.name))
            : new Set<string>();
    }

    private get _hasChanged() {
        if (!this.org || !this.member) {
            return false;
        }

        const currentVaults = this._getCurrentVaults();
        const vaultsChanged = this.org.vaults.some(({ id }) => {
            const c = currentVaults.get(id)!;
            const s = this._vaults.get(id)!;
            return c.read !== s.read || c.write !== s.write;
        });

        const currentGroups = this._getCurrentGroups();
        const groupsChanged =
            currentGroups.size !== this._groups.size ||
            [...this._groups.values()].some(name => !currentGroups.has(name));

        return vaultsChanged || groupsChanged;
    }

    async show({ member, org }: InputType): Promise<void> {
        this.member = member;
        this.org = org;
        this._groups = this._getCurrentGroups();
        this._vaults = this._getCurrentVaults();
        this._error = "";
        await this.updateComplete;
        return super.show();
    }

    _toggleGroup(group: Group) {
        if (this._groups.has(group.name)) {
            this._groups.delete(group.name);
        } else {
            this._groups.add(group.name);
        }
        this.requestUpdate();
    }

    private _toggleVault({ id }: { id: VaultID }) {
        const { read } = this._vaults.get(id)!;
        this._vaults.set(id, read ? { read: false, write: false } : { read: true, write: true });
        this.requestUpdate();
    }

    private _toggleRead({ id }: { id: VaultID }, event?: Event) {
        if (event) {
            event.stopImmediatePropagation();
        }

        const sel = this._vaults.get(id)!;
        sel.read = !sel.read;
        if (!sel.read) {
            sel.write = false;
        }

        this.requestUpdate();
    }

    private _toggleWrite({ id }: { id: VaultID }, event?: Event) {
        if (event) {
            event.stopImmediatePropagation();
        }

        const sel = this._vaults.get(id)!;
        sel.write = !sel.write;
        if (sel.write) {
            sel.read = true;
        }

        this.requestUpdate();
    }

    private async _save() {
        if (this._saveButton.state === "loading") {
            return;
        }

        this._error = "";
        this._saveButton.start();

        const vaults = [...this._vaults.entries()]
            .filter(([, { read }]) => read)
            .map(([id, { write }]) => ({ id, readonly: !write }));

        try {
            await app.updateMember(this.org!, this.member!, {
                vaults,
                groups: [...this._groups]
            });
            this._saveButton.success();
            this.done();
        } catch (e) {
            this._saveButton.fail();
            this._error = e.message || $l("Something went wrong. Please try again later!");
            throw e;
        }
    }

    private async _showOptions() {
        const isAdmin = this.member!.role === OrgRole.Admin;

        this.open = false;
        const choice = await choose(
            "",
            [$l("Remove"), $l("Suspend"), isAdmin ? $l("Remove Admin") : $l("Make Admin")],
            {
                hideIcon: true,
                type: "destructive"
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
            default:
                this.open = true;
        }
    }

    private async _removeMember() {
        this.open = false;
        const confirmed = await confirm(
            $l("Are you sure you want to remove this member from this organization?"),
            $l("Remove"),
            $l("Cancel"),
            {
                type: "destructive",
                title: $l("Remove Member")
            }
        );
        this.open = true;

        if (confirmed) {
            this._saveButton.start();

            try {
                await app.removeMember(this.org!, this.member!);

                this._saveButton.success();
                this.done();
            } catch (e) {
                this._saveButton.fail();
                throw e;
            }
        }
    }

    private async _makeAdmin() {
        this.open = false;

        const confirmed = await confirm(
            $l(
                "Are you sure you want to make this member an admin? " +
                    "Admins can manage vaults, groups and permissions."
            ),
            $l("Make Admin"),
            $l("Cancel")
        );

        this.open = true;

        if (confirmed) {
            this._saveButton.start();

            try {
                this.member = await app.updateMember(this.org!, this.member!, { role: OrgRole.Admin });
                this._saveButton.success();
            } catch (e) {
                this._saveButton.fail();
                throw e;
            }
        }
    }

    private async _removeAdmin() {
        this.open = false;

        const confirmed = await confirm(
            $l("Are you sure you want to remove this member as admin?"),
            $l("Remove Admin"),
            $l("Cancel"),
            { type: "destructive" }
        );

        this.open = true;

        if (confirmed) {
            this._saveButton.start();

            try {
                this.member = await app.updateMember(this.org!, this.member!, { role: OrgRole.Member });
                this._saveButton.success();
            } catch (e) {
                this._saveButton.fail();
                throw e;
            }
        }
    }

    private async _suspendMember() {
        this.open = false;

        const confirmed = await confirm(
            $l("Are you sure you want to suspend this member?"),
            $l("Suspend Member"),
            $l("Cancel"),
            { type: "destructive" }
        );

        this.open = true;

        if (confirmed) {
            this._saveButton.start();

            try {
                this.member = await app.updateMember(this.org!, this.member!, { role: OrgRole.Suspended });
                this._saveButton.success();
                this.done();
            } catch (e) {
                this._saveButton.fail();
                throw e;
            }
        }
    }

    shouldUpdate() {
        return !!this.org && !!this.member;
    }

    static styles = [
        ...Dialog.styles,
        css`
            .inner {
                background: var(--color-quaternary);
            }

            pl-toggle-button {
                display: block;
                padding: 0 15px 0 0;
            }

            .more-button {
                font-size: var(--font-size-small);
                align-self: flex-start;
                width: 30px;
                height: 30px;
                margin-top: 5px;
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

            .item {
                display: flex;
                align-items: center;
            }

            .item pl-toggle {
                margin-right: 14px;
            }
        `
    ];

    renderContent() {
        const org = this.org!;
        const member = this.member!;
        const accountIsOwner = org.isOwner(app.account!);
        const accountIsAdmin = org.isAdmin(app.account!);
        const memberIsOwner = org.isOwner(member);

        return html`
            <header>
                <pl-member-item .member=${member} class="flex"></pl-member-item>
                <pl-icon
                    icon="more"
                    class="more-button tap"
                    ?hidden=${!accountIsOwner || memberIsOwner}
                    @click=${this._showOptions}
                ></pl-icon>
            </header>

            <div class="content">
                <div class="subheader" ?hidden=${!org.groups.length}>
                    <div>${$l("Groups")}</div>
                </div>

                ${org.groups.map(
                    group => html`
                        <pl-toggle-button
                            ?disabled=${!accountIsAdmin}
                            class="item tap"
                            reverse
                            @click=${() => this._toggleGroup(group)}
                            .active=${this._groups.has(group.name)}
                        >
                            <pl-group-item .group=${group}></pl-group-item>
                        </pl-toggle-button>
                    `
                )}

                <div class="subheader">
                    <div>${$l("Vaults")}</div>
                    <div class="flex"></div>
                    <div class="permission">${$l("read")}</div>
                    <div class="permission">${$l("write")}</div>
                </div>

                ${org.vaults.map(
                    vault => html`
                        <div class="item tap" @click=${() => this._toggleVault(vault)} ?disabled=${!accountIsAdmin}>
                            <pl-vault-item .vault=${vault} class="flex"></pl-vault-item>
                            <pl-toggle
                                .active=${this._vaults.get(vault.id)!.read}
                                @click=${(e: Event) => this._toggleRead(vault, e)}
                            ></pl-toggle>
                            <pl-toggle
                                .active=${this._vaults.get(vault.id)!.write}
                                @click=${(e: Event) => this._toggleWrite(vault, e)}
                            ></pl-toggle>
                        </div>
                    `
                )}

                <div class="error item" ?hidden="${!this._error}">
                    ${this._error}
                </div>

                <div class="actions" ?hidden=${!accountIsAdmin}>
                    <pl-loading-button
                        class="tap primary"
                        id="saveButton"
                        ?disabled=${!this._hasChanged}
                        @click=${this._save}
                    >
                        ${$l("Save")}
                    </pl-loading-button>

                    <button class="tap" @click=${this.dismiss}>${$l("Cancel")}</button>
                </div>
            </div>
        `;
    }
}
