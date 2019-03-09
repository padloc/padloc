import { Group } from "@padloc/core/lib/group.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { app } from "../init.js";
import { element, html, property, query, queryAll, listen } from "./base.js";
import { Dialog } from "./dialog.js";
import { LoadingButton } from "./loading-button.js";

@element("pl-group-dialog")
export class GroupDialog extends Dialog<Group, void> {
    @property()
    group: Group | null = null;

    private get _org() {
        return (
            this.group &&
            app.orgs.find(org => [org.admins, org.everyone, ...org.groups].some(g => g.id === this.group!.id))
        );
    }

    @queryAll("input[type='checkbox']")
    private _checkboxes: HTMLInputElement[];

    @query("#saveButton")
    private _saveButton: LoadingButton;

    private _selectedMembers = new Set<string>();

    private get _currentMembers(): Set<string> {
        const members = new Set<string>();

        if (!this._org) {
            return members;
        }

        for (const member of this._org.getMembersForGroup(this.group!)) {
            members.add(member.id);
        }

        return members;
    }

    private get _hasChanged() {
        return (
            this._selectedMembers.size !== this._currentMembers.size ||
            [...this._selectedMembers.values()].some(group => !this._currentMembers.has(group))
        );
    }

    show(group: Group): Promise<void> {
        this.group = group;
        this._selectedMembers = new Set<string>(this._currentMembers);
        return super.show();
    }

    @listen("change", "input[type='checkbox']")
    _updateSelected() {
        this._selectedMembers.clear();

        for (const checkbox of this._checkboxes) {
            const member = checkbox.dataset.member;
            if (member && checkbox.checked) {
                this._selectedMembers.add(member);
            }
        }

        this.requestUpdate();
    }

    private async _save() {
        if (this._saveButton.state === "loading") {
            return;
        }

        this._saveButton.start();

        try {
            const org = this._org!.clone();
            await org.unlock(app.account!);
            const group = org.getGroup(this.group!.id)!;

            const members = [...this._selectedMembers.values()].map(id => org.getMember({ id }));
            await group.unlock(org.admins);
            await group.updateAccessors([org.admins, ...members]);

            await app.updateOrg(org, org);
            this._saveButton.success();
        } catch (e) {
            this._saveButton.fail();
            throw e;
        }

        this.requestUpdate();
    }

    shouldUpdate() {
        return !!this.group;
    }

    renderContent() {
        const group = this.group!;
        const members = this._org!.members;

        return html`
            <style>
                .inner {
                    background: var(--color-tertiary);
                    color: var(--color-secondary);
                    text-shadow: none;
                }
            </style>

            <h1>${group.name}</h1>

            <h2>${$l("Members")}</h2>

            <ul>
                ${members.map(
                    member => html`
                    <li>
                        <label>
                            <input
                                type="checkbox"
                                data-member=${member.id}
                                .checked=${this._selectedMembers.has(member.id)}
                            ></input> 
                            ${member.name}
                        </label>
                    </li>
                `
                )}
            </ul>

            <pl-loading-button id="saveButton" ?hidden=${!this._hasChanged} @click=${this._save}
                >${$l("Save")}</pl-loading-button
            >
        `;
    }
}
