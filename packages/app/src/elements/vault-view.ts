import { until } from "lit-html/directives/until.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { VaultMember } from "@padloc/core/lib/vault.js";
import { Invite } from "@padloc/core/lib/invite.js";
import { formatDateFromNow } from "../util.js";
import { shared, mixins } from "../styles";
import { dialog, alert, confirm, prompt } from "../dialog.js";
import { app, router } from "../init.js";
import { BaseElement, element, html, property, listen, query, observe } from "./base.js";
import { SelectAccountDialog } from "./select-account-dialog.js";
import { Input } from "./input.js";
import { ToggleButton } from "./toggle-button.js";
import "./toggle-button.js";
import "./account-item.js";
import "./icon.js";

@element("pl-vault-view")
export class VaultView extends BaseElement {
    @property()
    selected: string = "";

    get vault() {
        return this.selected ? app.getVault(this.selected) : null;
    }

    get parentVault() {
        return this.vault && this.vault.parent && app.getVault(this.vault.parent.id);
    }

    @property()
    private _editing: boolean;

    @query("#nameInput")
    private _nameInput: Input;

    @dialog("pl-select-account-dialog")
    private _selectAccountDialog: SelectAccountDialog;

    @listen("synchronize", app)
    @listen("vault-changed", app)
    _refresh() {
        this.requestUpdate();
        this.$$("pl-account-item", false).forEach((el: any) => el.requestUpdate());
    }

    private edit() {
        this._editing = true;
        this._nameInput.focus();
    }

    private async save() {
        this._editing = false;
        await app.updateVault(this.vault!, { name: this._nameInput.value });
    }

    @observe("selected")
    _selectedChanged() {
        this._editing = false;
    }

    private async _invite() {
        prompt($l("Please enter the email address of the person you would like to invite!"), {
            type: "email",
            title: $l("Invite New Member"),
            label: $l("Email Address"),
            confirmLabel: $l("Send Invite"),
            validate: async (email: string, input: Input) => {
                if (input.invalid) {
                    throw $l("Please enter a valid email address!");
                }

                if ([...this.vault!.members].some(m => m.email === email)) {
                    throw $l("This user is already a member!");
                }

                const invite = await app.createInvite(this.vault!, email);
                this._showInvite(invite);

                return email;
            }
        });
    }

    private async _addParentMember() {
        const parent = app.getVault(this.vault!.parent!.id);
        const acc = await this._selectAccountDialog.show([...parent!.members].filter(m => !this.vault!.isMember(m)));
        if (acc) {
            await this.vault!.addMember(acc);
            await app.syncVault(this.vault!);
        }
    }

    private async _addMember() {
        if (this.vault!.parent) {
            this._addParentMember();
        } else {
            this._invite();
        }
    }

    private async _showInvite(invite: Invite) {
        router.go(`invite/${invite.vault!.id}/${invite.id}`);
    }

    private _openVault(vault: { id: string }) {
        router.go(`vaults/${vault.id}`);
    }

    private _showItems() {
        app.filter = { vault: this.vault };
        router.go("items");
    }

    private async _addSubVault() {
        await prompt($l("Please choose a vault name!"), {
            title: $l("Create Subvault"),
            label: $l("Vault Name"),
            confirmLabel: $l("Create"),
            validate: async (name: string) => {
                if (!name) {
                    throw $l("Please enter a vault name!");
                }
                await app.createVault(name, this.vault!);
                return name;
            }
        });
    }

    private async _removeMember(member: VaultMember) {
        const vault = this.vault!;

        const confirmed = await confirm(
            $l(
                vault.parent
                    ? "Are you sure you want to remove {0} from {1}?"
                    : "Are you sure you want to remove {0} from {1} and all of its subvaults?",
                member.name || member.email,
                vault.toString()
            )
        );

        if (confirmed) {
            await app.removeMember(this.vault!, member);
        }
    }

    private async _toggleAdmin(member: VaultMember, e: MouseEvent) {
        const button = e.target as ToggleButton;
        const question = button.active
            ? "Do you want to give {0} admin permissions? They will be able to " +
              "add and delete members, change permissions and create subvaults."
            : "Do you want to remove {0} as an admin?";
        const confirmed = await confirm($l(question, member.name || member.email), $l("Make Admin"));

        if (confirmed) {
            member.permissions.manage = button.active;
            if (member.permissions.manage) {
                member.permissions.write = true;
            }
            this.vault!.members.update(member);
            app.syncVault(this.vault!);
        } else {
            button.active = !button.active;
        }
    }

    private async _toggleReadonly(member: VaultMember) {
        member.permissions.write = !member.permissions.write;
        this.vault!.members.update(member);
        this.requestUpdate();
        app.syncVault(this.vault!);
    }

    private async _deleteVault() {
        const confirmed = await prompt(
            $l(
                "Are you sure you want to delete this vault? " +
                    "All the data stored in it will be lost! " +
                    "This action can not be undone."
            ),
            {
                type: "warning",
                placeholder: $l("Type 'DELETE' to confirm"),
                validate: async val => {
                    if (val !== "DELETE") {
                        throw $l("Type 'DELETE' to confirm");
                    }
                    return val;
                }
            }
        );

        if (confirmed) {
            await app.deleteVault(this.vault!);
            router.go("vaults");
            alert($l("Vault deleted successfully"), { type: "success" });
        }
    }

    private async _confirmMember(member: VaultMember) {
        let invite = this.vault!.getInviteByEmail(member.email);

        if (!invite) {
            const confirmed = await confirm(
                $l(
                    "This member has been suspended from this vault until their membership " +
                        "is confirmed. Do you want to send a confirmation request now?"
                ),
                $l("Send Request"),
                $l("Cancel"),
                { title: $l("Confirm Membership") }
            );

            if (confirmed) {
                invite = await app.createInvite(this.vault!, member.email, "confirm_membership");
            }
        }

        if (invite) {
            this._showInvite(invite);
        }
    }

    shouldUpdate() {
        return !!this.vault;
    }

    render() {
        const vault = this.vault!;
        const { name, members, items, vaults } = vault;
        const subvaults = vault === app.mainVault ? [] : [...vaults].map(v => app.getVault(v.id)!);
        const permissions = vault.getPermissions();
        const isAdmin = vault.isAdmin() && !vault.isSuspended();
        const invites = isAdmin ? [...vault.invites] : [];

        return html`
        ${shared}

        <style>

            :host {
                display: flex;
                flex-direction: column;
                background: var(--color-quaternary);
            }

            .tags {
                padding: 0 15px;
            }

            .name {
                height: auto;
                font-size: 150%;
                padding: 6px 10px;
                box-sizing: border-box;
                margin: 10px;
            }

            pl-account-item:not(:last-of-kind) {
                border-bottom: solid 1px #ddd;
            }

            .add-icon {
                background: var(--color-secondary);
                color: var(--color-tertiary);
                font-size: var(--font-size-small);
                width: 30px;
                height: 30px;
            }

            .remove-button {
                font-size: 150%;
                width: 50px;
                height: 50px;
                margin: 14px;
            }

            li {
                display: flex;
                align-items: center;
                background: var(--color-tertiary);
                border-top: solid 1px #eee;
            }

            li:last-child {
                border-bottom: solid 1px #eee;
            }

            li:hover {
                background: #fafafa;
            }

            li:not(:hover) .remove-button {
                display: none;
            }

            .invite {
                padding: 15px 17px;
            }

            .invite .tags {
                padding: 0;
                margin: 0;
            }

            .invite-email {
                font-weight: bold;
                ${mixins.ellipsis()}
                margin-bottom: 8px;
            }

            .invite-code {
                text-align: center;
            }

            .invite-code-label {
                font-weight: bold;
                font-size: var(--font-size-micro);
            }

            .invite-code-value {
                font-size: 140%;
                font-family: var(--font-family-mono);
                font-weight: bold;
                text-transform: uppercase;
                cursor: text;
                user-select: text;
                letter-spacing: 2px;
            }

            .member {
                height: 80px;
                display: flex;
                align-items: center;
            }

            .member pl-fingerprint {
                color: var(--color-secondary);
                --color-background: var(--color-tertiary);
                width: 46px;
                height: 46px;
                border-radius: 100%;
                border: solid 1px var(--border-color);
                margin: 15px;
            }

            .member-info {
                flex: 1;
                width: 0;
                padding-right: 18px;
            }

            .member-email {
                ${mixins.ellipsis()}
            }

            .member-email {
                font-weight: bold;
                ${mixins.ellipsis()}
            }

            .permission-tags {
                padding: 0;
                margin: 0 8px 0 2px;
            }

            .permission-buttons {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
            }

            .permission-buttons > * {
                --toggle-width: 24px;
                --toggle-height: 18px;
                --color-background: var(--color-secondary);
                --color-foreground: var(--color-tertiary);
                background: var(--color-background);
                font-size: var(--font-size-micro);
                color: var(--color-foreground);
                font-weight: bold;
                border-radius: 20px;
                height: auto;
                padding: 4px 4px 4px 8px;
                margin: 2px 8px;
            }

            .member:not(:hover) .permission-buttons,
            .member:not(:hover) .remove-button,
            .member:hover pl-fingerprint,
            .member:hover .permission-tags {
                display: none;
            }
        </style>

        <header class="narrow back-header">

            <pl-icon icon="backward" @click=${() => router.go("vaults")}></pl-icon>

            <div @click=${() => router.go("vaults")}>${$l("Vaults")}</div>

        </header>

        <main>

            <pl-input
                id="nameInput"
                class="name"
                .value=${name}
                .placeholder=${$l("Enter Vault Name")}
                ?readonly=${!this._editing}>
            </pl-input>

            <div class="tags animate">

                <div
                    class="tag highlight tap flex"
                    ?hidden=${!vault.parent}
                    @click=${() => this._openVault(vault.parent!)}>

                    <pl-icon icon="vault"></pl-icon>

                    <div>${vault.parent && vault.parent.name}</div>

                </div>

                <div class="tag flex tap" @click=${() => this._showItems()}>

                    <pl-icon icon="list"></pl-icon>

                    <div>${$l("{0} Items", items.size.toString())}</div>

                </div>

                <div class="tag flex tap" @click=${() => app.syncVault(vault)}>

                    <pl-icon icon="refresh"></pl-icon>

                    <div>${until(formatDateFromNow(vault.revision.date))}</div>

                </div>

            </div>

            <h2 ?hidden=${!invites.length} class="animate">
                ${$l("Invites")}
            </h2>

            <ul>

            ${invites.map(inv => {
                const status = inv.expired
                    ? { icon: "time", class: "warning", text: $l("expired") }
                    : inv.accepted
                        ? { icon: "check", class: "highlight", text: $l("accepted") }
                        : {
                              icon: "time",
                              class: "",
                              text: (async () => $l("expires {0}", await formatDateFromNow(inv.expires)))()
                          };

                return html`
                <li class="invite layout align-center tap animate" @click=${() => this._showInvite(inv)}>

                    <div flex>

                        <div class="invite-email">${inv.email}</div> 

                        <div class="tags small">

                            <div class="tag ${status.class}">

                                <pl-icon icon="${status.icon}"></pl-icon>

                                <div>${until(status.text)}</div>

                            </div>

                        </div>

                    </div>

                    <div class="invite-code">

                        <div class="invite-code-label">${$l("Confirmation Code:")}</div>

                        <div class="invite-code-value">${inv.secret}</div>

                    </div>

                </li>
            `;
            })}

            </ul>

            <h2 class="animate">

                <div class="flex">${$l("Members")}</div>

                <pl-icon
                    icon="add"
                    class="add-icon tap"
                    @click=${() => this._addMember()}
                    ?hidden=${vault === app.mainVault || !isAdmin}
                    ?disabled=${this.parentVault && vault.members.size === this.parentVault.members.size}>
                ></pl-icon>

            </h2>

            <ul>

                ${[...members].map(
                    member => html`
                        <li class="member">

                            <pl-fingerprint .key=${member.publicKey}></pl-fingerprint>

                            <pl-icon
                                icon="remove"
                                class="remove-button tap"
                                ?disabled=${!isAdmin || vault.isOwner(member)}
                                @click=${() => this._removeMember(member)}>
                            </pl-icon>

                            <div class="member-info">

                                <div class="member-name">${member.name}</div>

                                <div class="member-email">${member.email}</div>

                            </div>

                            ${
                                member.suspended
                                    ? html`
                            <div class="tags small tap">
                                <div class="tag warning" @click=${() => this._confirmMember(member)}>
                                    ${$l("suspended")}
                                </div>
                            </div>
                            `
                                    : html`
                            <div class="tags small permission-tags">

                                <div class="tag" ?hidden=${!vault.isOwner(member)}>${$l("owner")}</div>

                                <div class="tag" ?hidden=${vault.isOwner(member) || !member.permissions.manage}>
                                    ${$l("admin")}
                                </div>

                                <div class="tag" ?hidden=${member.permissions.write}>${$l("readonly")}</div>

                            </div>

                            <div class="permission-buttons">

                                <pl-toggle-button
                                    .label=${$l("admin")}
                                    .active=${member.permissions.manage}
                                    ?disabled=${!isAdmin || vault.isOwner(member)}
                                    @click=${(e: MouseEvent) => this._toggleAdmin(member, e)} 
                                    class="tap"
                                    reverse>
                                </pl-toggle-button>

                                <pl-toggle-button
                                    .label=${$l("readonly")}
                                    .active=${!member.permissions.write}
                                    ?disabled=${!isAdmin || member.permissions.manage}
                                    @click=${() => this._toggleReadonly(member)} 
                                    class="tap"
                                    reverse>
                                </pl-toggle-button>

                            </div>
                            `
                            }

                        </li>
                    `
                )}

            </ul>

            <h2 class="animate"
                ?hidden=${vault === app.mainVault || !!vault.parent || (!permissions.manage && !subvaults.length)}>

                <div class="flex">${$l("Subvaults")}</div>

                <pl-icon
                    icon="add"
                    class="add-icon tap"
                    @click=${() => this._addSubVault()}
                    ?hidden=${!isAdmin}>
                ></pl-icon>

            </h2>

            <ul>

                ${subvaults.map(
                    vault => html`
                    <li>

                        <pl-vault-list-item
                            .vault=${vault}
                            class="animate tap flex"
                            @click=${() => this._openVault(vault)}>
                        </pl-vault-list-item>

                    </li>
                    `
                )}

            </ul>

        </main>

        <div class="fabs" ?hidden=${!this._editing}>

            <pl-icon icon="delete"
                class="fab tap destructive"
                @click=${() => this._deleteVault()}
                ?hidden=${!vault.isOwner()}>
            </pl-icon>

            <div class="flex"></div>

            <pl-icon icon="check"
                class="tap fab"
                @click=${() => this.save()}>
            </pl-icon>

        </div>

        <div class="fabs" ?hidden=${this._editing || !isAdmin}>

            <div class="flex"></div>

            <pl-icon icon="edit"
                class="tap fab"
                @click=${() => this.edit()}>
            </pl-icon>

        </div>
       `;
    }
}
