import { VaultID } from "@padloc/core/src/vault";
import { Org, Group, OrgMember } from "@padloc/core/src/org";
import { translate as $l } from "@padloc/locale/src/translate";
import { mixins } from "../styles";
import { app } from "../globals";
import { prompt } from "../lib/dialog";
import { element, html, css, property, query } from "./base";
import { Dialog } from "./dialog";
import { LoadingButton } from "./loading-button";
import { Input } from "./input";
import "./icon";
import "./group-item";
import "./member-item";
import "./toggle";

type InputType = { vault: { id: VaultID; name: string } | null; org: Org };

@element("pl-vault-dialog")
export class VaultDialog extends Dialog<InputType, void> {
    @property()
    org: Org | null = null;

    @property()
    vault: { id: VaultID; name: string } | null = null;

    @query("#nameInput")
    private _nameInput: Input;

    @query("#saveButton")
    private _saveButton: LoadingButton;

    @query("#filterInput")
    private _filterInput: Input;

    @property()
    private _filterString: string = "";

    @property()
    private _error: string = "";

    private _members = new Map<string, { read: boolean; write: boolean }>();

    private _groups = new Map<string, { read: boolean; write: boolean }>();

    private _getCurrentMembers(): Map<string, { read: boolean; write: boolean }> {
        const members = new Map<string, { read: boolean; write: boolean }>();

        if (!this.org) {
            return members;
        }

        for (const member of this.org.members) {
            const v = this.vault && member.vaults.find(v => v.id === this.vault!.id);
            members.set(member.id, {
                read: !!v,
                write: !!v && !v.readonly
            });
        }

        return members;
    }

    private _getCurrentGroups(): Map<string, { read: boolean; write: boolean }> {
        const groups = new Map<string, { read: boolean; write: boolean }>();

        if (!this.org) {
            return groups;
        }

        for (const group of this.org.groups) {
            const v = this.vault && group.vaults.find(v => v.id === this.vault!.id);
            groups.set(group.name, {
                read: !!v,
                write: !!v && !v.readonly
            });
        }

        return groups;
    }

    private get _hasChanged() {
        if (!this.org || !this._nameInput) {
            return false;
        }

        const currentGroups = this._getCurrentGroups();
        const groupsChanged = this.org.groups.some(({ name }) => {
            const c = currentGroups.get(name)!;
            const s = this._groups.get(name)!;
            return c.read !== s.read || c.write !== s.write;
        });

        const currentMembers = this._getCurrentMembers();
        const membersChanged = this.org.members.some(({ id }) => {
            const c = currentMembers.get(id)!;
            const s = this._members.get(id)!;
            return c.read !== s.read || c.write !== s.write;
        });

        const nameChanged = this.vault ? this.vault.name !== this._nameInput.value : !!this._nameInput.value;

        return (
            (this._groups.size || this._members.size) &&
            this._nameInput.value &&
            (groupsChanged || membersChanged || nameChanged)
        );
    }

    async show({ vault, org }: InputType): Promise<void> {
        this._error = "";
        this.vault = vault;
        this.org = org;
        this._members = this._getCurrentMembers();
        this._groups = this._getCurrentGroups();
        await this.updateComplete;
        this._nameInput.value = this.vault ? this.vault.name : "";
        return super.show();
    }

    private _toggle(obj: Group | OrgMember) {
        if (obj instanceof Group) {
            const { read } = this._groups.get(obj.name)!;
            this._groups.set(obj.name, read ? { read: false, write: false } : { read: true, write: true });
        } else {
            const { read } = this._members.get(obj.id)!;
            this._members.set(obj.id, read ? { read: false, write: false } : { read: true, write: true });
        }
        this.requestUpdate();
    }

    private _toggleRead(obj: Group | OrgMember, event?: Event) {
        if (event) {
            event.stopImmediatePropagation();
        }

        const sel = obj instanceof Group ? this._groups.get(obj.name)! : this._members.get(obj.id)!;
        sel.read = !sel.read;
        if (!sel.read) {
            sel.write = false;
        }

        this.requestUpdate();
    }

    private _toggleWrite(obj: Group | OrgMember, event?: Event) {
        if (event) {
            event.stopImmediatePropagation();
        }

        const sel = obj instanceof Group ? this._groups.get(obj.name)! : this._members.get(obj.id)!;
        sel.write = !sel.write;
        if (sel.write) {
            sel.read = true;
        }

        this.requestUpdate();
    }

    // _toggleReadonly(group: Group) {
    //     this._selection.get(group.id)!.readonly = !this._selection.get(group.id)!.readonly;
    // }

    private async _save() {
        if (this._saveButton.state === "loading") {
            return;
        }

        this._error = "";
        this._saveButton.start();

        const groups = [...this._groups.entries()]
            .filter(([, { read }]) => read)
            .map(([name, { write }]) => ({ name, readonly: !write }));

        const members = [...this._members.entries()]
            .filter(([, { read }]) => read)
            .map(([id, { write }]) => ({ id, readonly: !write }));

        try {
            if (this.vault) {
                await app.updateVault(this.org!.id, this.vault.id, this._nameInput.value, members, groups);
            } else {
                await app.createVault(this._nameInput.value, this.org!, members, groups);
            }

            this._saveButton.success();
            this.done();
        } catch (e) {
            this._saveButton.fail();
            this._error = e.message || $l("Something went wrong. Please try again later!");
            throw e;
        }

        this.requestUpdate();
    }

    private async _deleteVault() {
        this.open = false;
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
                validate: async val => {
                    if (val !== "DELETE") {
                        throw $l("Type 'DELETE' to confirm");
                    }

                    await app.deleteVault(this.vault!.id);

                    return val;
                }
            }
        );

        if (deleted) {
            this.done();
        } else {
            this.open = true;
        }
    }

    private _updateFilter() {
        this._filterString = this._filterInput.value;
    }

    private _clearFilter() {
        this._filterString = this._filterInput.value = "";
    }

    shouldUpdate() {
        return !!this.org;
    }

    static styles = [
        ...Dialog.styles,
        css`
            .inner {
                background: var(--color-quaternary);
            }

            .delete-button {
                color: var(--color-negative);
                font-size: var(--font-size-default);
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
                text-align: center;
                font-size: var(--font-size-tiny);
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
        const isAdmin = org.isAdmin(app.account!);
        const isOwner = org.isOwner(app.account!);

        const filter = this._filterString.toLowerCase();

        const members = filter
            ? org.members.filter(
                  ({ name, email }) => email.toLowerCase().includes(filter) || name.toLowerCase().includes(filter)
              )
            : org.members;

        const groups = filter ? org.groups.filter(({ name }) => name.toLowerCase().includes(filter)) : org.groups;

        return html`
            <header>
                <pl-icon icon="vault"></pl-icon>
                <pl-input
                    id="nameInput"
                    class="flex"
                    .placeholder=${$l("Enter Vault Name")}
                    .readonly=${!isAdmin}
                    @input=${() => this.requestUpdate()}
                ></pl-input>
                <pl-icon
                    icon="delete"
                    class="delete-button tap"
                    ?hidden=${!isOwner}
                    @click=${this._deleteVault}
                ></pl-icon>
            </header>

            <div class="content">
                <div class="search-wrapper item">
                    <pl-icon icon="search"></pl-icon>
                    <pl-input id="filterInput" placeholder="${$l("Search...")}" @input=${this._updateFilter}></pl-input>
                    <pl-icon icon="cancel" class="tap" @click=${this._clearFilter}></pl-icon>
                </div>

                <div class="subheader" ?hidden=${!members.length}>
                    <div>${$l("Members")}</div>
                    <div class="flex"></div>
                    <div class="permission">${$l("read")}</div>
                    <div class="permission">${$l("write")}</div>
                </div>

                ${members.map(
                    member => html`
                        <div class="item tap" @click=${() => this._toggle(member)} ?disabled=${!isAdmin}>
                            <pl-member-item hideRole .member=${member} class="flex"></pl-member-item>
                            <pl-toggle
                                .active=${this._members.get(member.id)!.read}
                                @click=${(e: Event) => this._toggleRead(member, e)}
                            ></pl-toggle>
                            <pl-toggle
                                .active=${this._members.get(member.id)!.write}
                                @click=${(e: Event) => this._toggleWrite(member, e)}
                            ></pl-toggle>
                        </div>
                    `
                )}

                <div class="subheader" ?hidden=${!groups.length}>
                    <div>${$l("Groups")}</div>
                    <div class="flex"></div>
                    <div class="permission">${$l("read")}</div>
                    <div class="permission">${$l("write")}</div>
                </div>

                ${groups.map(
                    group => html`
                        <div class="item tap" @click=${() => this._toggle(group)} ?disabled=${!isAdmin}>
                            <pl-group-item .group=${group} class="flex"></pl-group-item>
                            <pl-toggle
                                .active=${this._groups.get(group.name)!.read}
                                @click=${(e: Event) => this._toggleRead(group, e)}
                            ></pl-toggle>
                            <pl-toggle
                                .active=${this._groups.get(group.name)!.write}
                                @click=${(e: Event) => this._toggleWrite(group, e)}
                            ></pl-toggle>
                        </div>
                    `
                )}

                <div class="error item" ?hidden="${!this._error}">
                    ${this._error}
                </div>

                <div class="actions" ?hidden=${!isAdmin}>
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
