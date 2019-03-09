import { Vault } from "@padloc/core/lib/vault.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { app } from "../init.js";
import { element, html, property, query, queryAll, listen } from "./base.js";
import { Dialog } from "./dialog.js";
import { LoadingButton } from "./loading-button.js";

@element("pl-vault-dialog")
export class VaultDialog extends Dialog<Vault, void> {
    private get _org() {
        return this.vault && app.getOrg(this.vault.org!.id);
    }

    @queryAll("input[type='checkbox']")
    private _checkboxes: HTMLInputElement[];

    @query("#saveButton")
    private _saveButton: LoadingButton;

    private _selectedGroups = new Set<string>();

    private get _currentGroups(): Set<string> {
        const groups = new Set<string>();

        if (!this._org) {
            return groups;
        }

        for (const group of this._org.getGroupsForVault(this.vault!)) {
            groups.add(group.id);
        }

        return groups;
    }

    private get _hasChanged() {
        return (
            this._selectedGroups.size !== this._currentGroups.size ||
            [...this._selectedGroups.values()].some(group => !this._currentGroups.has(group))
        );
    }

    @property()
    vault: Vault | null = null;

    show(vault: Vault): Promise<void> {
        this.vault = vault;
        this._selectedGroups = new Set<string>(this._currentGroups);
        return super.show();
    }

    @listen("change", "input[type='checkbox']")
    _updateSelected() {
        this._selectedGroups.clear();

        for (const checkbox of this._checkboxes) {
            const group = checkbox.dataset.group;
            if (group && checkbox.checked) {
                this._selectedGroups.add(group);
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
            const vault = this.vault!;

            // Make sure that admin group is included
            this._selectedGroups.add(org.admins.id);

            for (const group of org.getGroupsForVault(vault)) {
                if (!this._selectedGroups.has(group.id)) {
                    group.vaults = group.vaults.filter(v => v.id !== vault.id);
                }
            }

            for (const groupId of this._selectedGroups.values()) {
                const group = org.getGroup(groupId)!;
                if (!group.vaults.some(v => v.id === vault.id)) {
                    group.vaults.push({ id: vault.id, readonly: false });
                }
            }

            await app.updateOrg(org, org);
            await app.syncVault(vault);
            this._saveButton.success();
        } catch (e) {
            this._saveButton.fail();
            throw e;
        }

        this.requestUpdate();
    }

    shouldUpdate() {
        return !!this.vault;
    }

    renderContent() {
        const vault = this.vault!;
        const org = app.getOrg(vault.org!.id)!;
        const groups = [org.admins, org.everyone, ...org.groups];

        return html`
            <style>
                .inner {
                    background: var(--color-tertiary);
                    color: var(--color-secondary);
                    text-shadow: none;
                }
            </style>

            <h1>${vault.name}</h1>

            <h2>${$l("Groups")}</h2>

            <ul>
                ${groups.map(
                    group => html`
                    <li>
                        <label>
                            <input
                                type="checkbox"
                                data-group=${group.id}
                                .checked=${this._selectedGroups.has(group.id)}
                            ></input> 
                            ${group.name}
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
