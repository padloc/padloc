import { Org, OrgMember, Group } from "@padloc/core/src/org";
import { translate as $l } from "@padloc/locale/src/translate";
import { app } from "../globals";
import { prompt } from "../lib/dialog";
import { element, html, css, property, query } from "./base";
import { Dialog } from "./dialog";
import { LoadingButton } from "./loading-button";
import { Input } from "./input";
import "./toggle-button";
import "./member-item";

type InputType = { group: Group | null; org: Org };

@element("pl-group-dialog")
export class GroupDialog extends Dialog<InputType, void> {
    @property()
    group: Group | null = null;

    @property()
    org: Org | null = null;

    @query("#saveButton")
    private _saveButton: LoadingButton;

    @query("#nameInput")
    private _nameInput: Input;

    @query("#filterMembersInput")
    private _filterMembersInput: Input;

    @property()
    private _membersFilter: string = "";

    @property()
    private _error: string = "";

    private _members = new Set<string>();

    private _getCurrentMembers(): Set<string> {
        const members = new Set<string>();

        if (!this.group || !this.org) {
            return members;
        }

        for (const member of this.org.getMembersForGroup(this.group!)) {
            members.add(member.id);
        }

        return members;
    }

    private get _hasChanged() {
        if (!this._nameInput) {
            return false;
        }
        const currentMembers = this._getCurrentMembers();
        const membersChanged =
            this._members.size !== currentMembers.size ||
            [...this._members.values()].some(group => !currentMembers.has(group));

        const nameChanged = this.group ? this.group.name !== this._nameInput.value : !!this._nameInput.value;

        return this._members.size && this._nameInput.value && (membersChanged || nameChanged);
    }

    async show({ org, group }: InputType): Promise<void> {
        this.org = org;
        this.group = group;
        this._members = this._getCurrentMembers();
        this._error = "";
        await this.updateComplete;
        this._nameInput.value = group ? group.name : "";
        this._clearMembersFilter();
        if (group) {
            setTimeout(() => this._nameInput.focus(), 100);
        }
        await super.show();
    }

    _toggleMember(member: OrgMember) {
        if (this._members.has(member.id)) {
            this._members.delete(member.id);
        } else {
            this._members.add(member.id);
        }

        this.requestUpdate();
    }

    private async _save() {
        if (this._saveButton.state === "loading") {
            return;
        }

        this._error = "";
        this._saveButton.start();

        try {
            const org = this.org!;
            const members = [...this._members.values()].map(id => org.getMember({ id })!);

            if (this.group) {
                await app.updateGroup(org, this.group, members, this._nameInput.value);
            } else {
                await app.createGroup(org, this._nameInput.value, members);
            }

            this._saveButton.success();
            this.done();
        } catch (e) {
            this._error = e.message || $l("Something went wrong. Please try again later!");
            this._saveButton.fail();
            throw e;
        }
    }

    private async _deleteGroup() {
        this.open = false;

        const deleted = await prompt($l("Are you sure you want to delete this group?"), {
            type: "destructive",
            title: $l("Delete Group"),
            placeholder: $l("Type 'DELETE' to confirm"),
            confirmLabel: $l("Delete"),
            validate: async val => {
                if (val !== "DELETE") {
                    throw $l("Type 'DELETE' to confirm");
                }

                await app.updateOrg(this.org!.id, async org => {
                    org.groups = org.groups.filter(group => group.name !== this.group!.name);
                });

                return val;
            }
        });

        if (deleted) {
            this.done();
        } else {
            this.open = true;
        }
    }

    private _updateMembersFilter() {
        this._membersFilter = this._filterMembersInput.value;
    }

    private _clearMembersFilter() {
        this._membersFilter = this._filterMembersInput.value = "";
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

            pl-toggle-button {
                display: block;
                padding: 0 15px 0 0;
            }

            .delete-button {
                color: var(--color-negative);
                font-size: var(--font-size-default);
            }
        `
    ];

    renderContent() {
        const org = this.org!;
        const memFilter = this._membersFilter.toLowerCase();
        const members = memFilter
            ? org.members.filter(
                  ({ name, email }) => email.toLowerCase().includes(memFilter) || name.toLowerCase().includes(memFilter)
              )
            : org.members;
        // members.sort((a, b) => this._members.has(a.id) - this._members.has(b.id));
        const canEdit = org.isAdmin(app.account!);
        const canDelete = this.group && canEdit;

        return html`
            <header>
                <pl-icon icon="group"></pl-icon>
                <pl-input
                    id="nameInput"
                    class="flex"
                    .placeholder=${$l("Enter Group Name")}
                    .readonly=${!canEdit}
                    @input=${() => this.requestUpdate()}
                ></pl-input>
                <pl-icon
                    icon="delete"
                    class="delete-button tap"
                    @click=${this._deleteGroup}
                    ?hidden=${!canDelete}
                ></pl-icon>
            </header>

            <div class="content">
                <div class="search-wrapper item">
                    <pl-icon icon="search"></pl-icon>
                    <pl-input
                        id="filterMembersInput"
                        placeholder="${$l("Search...")}"
                        @input=${this._updateMembersFilter}
                    ></pl-input>
                    <pl-icon icon="cancel" class="tap" @click=${this._clearMembersFilter}></pl-icon>
                </div>

                ${members.map(
                    member => html`
                        <pl-toggle-button
                            class="item tap"
                            reverse
                            @click=${() => this._toggleMember(member)}
                            .active=${this._members.has(member.id)}
                            ?disabled=${!canEdit}
                        >
                            <pl-member-item hideRole .member=${member}></pl-member-item>
                        </pl-toggle-button>
                    `
                )}

                <div class="error item" ?hidden="${!this._error}">
                    ${this._error}
                </div>

                <div class="actions" ?hidden=${!canEdit}>
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
