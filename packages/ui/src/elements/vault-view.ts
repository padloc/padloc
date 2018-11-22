import { localize as $l } from "@padlock/core/lib/locale.js";
import { VaultInfo, VaultMember } from "@padlock/core/lib/vault.js";
import { Invite } from "@padlock/core/lib/invite.js";
import { formatDateFromNow } from "../util.js";
import { shared, mixins } from "../styles";
import { dialog, confirm, prompt } from "../dialog.js";
import { animateCascade } from "../animation.js";
import { app, router } from "../init.js";
import { BaseElement, element, html, property, listen } from "./base.js";
import { InviteDialog } from "./invite-dialog.js";
import { SelectAccountDialog } from "./select-account-dialog.js";
import { Input } from "./input.js";
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

    @dialog("pl-invite-dialog")
    private _inviteDialog: InviteDialog;

    @dialog("pl-select-account-dialog")
    private _selectAccountDialog: SelectAccountDialog;

    @listen("synchronize", app)
    @listen("vault-changed", app)
    _refresh() {
        this.requestUpdate();
        this.$$("pl-account-item", false).forEach((el: any) => el.requestUpdate());
    }

    async _activated() {
        animateCascade(this.$$(".animate:not([hidden])", false), { initialDelay: 200 });
        if (
            this.vault &&
            this.vault != app.mainVault &&
            this.vault.members.size === 1 &&
            !this.vault.invites.size &&
            this.vault.getPermissions().manage
        ) {
            const confirmed = await confirm(
                $l("There is nobody else here yet. Do you want to add somebody else to this vault?"),
                $l("Invite Others"),
                $l("Stay Lonely"),
                { icon: "vault" }
            );
            if (confirmed) {
                this._invite();
            }
        }

        const invite = this.vault!.getInviteByEmail(app.account!.email);
        if (invite && !invite.accepted) {
            this._showInvite(invite);
        }

        if (this.vault!.isAdmin()) {
            for (const invite of [...this.vault!.invites].filter(i => i.accepted)) {
                this._showInvite(invite);
            }
        }
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
                await this._inviteDialog.show(invite);

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
        await this._inviteDialog.show(invite);
    }

    private _openVault(vault: VaultInfo) {
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
            this.vault!.members.remove(member);
            for (const { id } of vault.vaults) {
                const vault = app.getVault(id)!;
                vault.members.remove(member);
                app.syncVault(vault);
            }
            app.syncVault(this.vault!);
        }
    }

    // private async _delete() {
    //     const confirmed = await prompt($l("Are you sure you want to delete the '{0}' vault?", this.vault!.name), {
    //         placeholder: $l("Type 'DELETE' to confirm"),
    //         validate: async val => {
    //             if (val !== "DELETE") {
    //                 throw $l("Type 'DELETE' to confirm");
    //             }
    //             return val;
    //         }
    //     });
    //
    //     if (confirmed) {
    //         await app.deleteSharedVault(this.vault!.id);
    //         alert($l("Vault deleted successfully"));
    //     }
    // }

    shouldUpdate() {
        return !!this.vault;
    }

    render() {
        const vault = this.vault!;
        const { name, members, items, vaults } = vault;
        const subvaults = vault === app.mainVault ? [] : [...vaults].map(v => app.getVault(v.id)!);
        const permissions = vault.getPermissions();
        const invites = vault.isAdmin() ? [...vault.invites] : [];
        const admins = [...members].filter(m => vault.isAdmin(m));
        const nonAdmins = [...members].filter(m => !vault.isAdmin(m));

        return html`
        ${shared}

        <style>

            :host {
                display: flex;
                flex-direction: column;
                background: var(--color-tertiary);
            }

            .tags {
                margin: 15px;
            }

            .name {
                font-size: 140%;
                padding: 6px 12px;
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
                font-size: 120%;
                margin: 10px;
            }

            li {
                display: flex;
                align-items: center;
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
        </style>

        <header class="narrow back-header">

            <pl-icon icon="backward" @click=${() => router.go("vaults")}></pl-icon>

            <div @click=${() => router.go("vaults")}>${$l("Vaults")}</div>

        </header>

        <main>

            <h1>${name}</h1>

            <div class="tags animate">

                <div
                    class="tag highlight tap flex"
                    ?hidden=${!vault.parent}
                    @click=${() => this._openVault(vault.parent!)}>

                    <pl-icon icon="vault"></pl-icon>

                    <div>${vault.parent && vault.parent.name}</div>

                </div>

                <div class="tag flex">

                    <pl-icon icon="group"></pl-icon>

                    <div>${$l("{0} Members", members.size.toString())}</div>

                </div>

                <div class="tag flex tap" @click=${() => this._showItems()}>

                    <pl-icon icon="list"></pl-icon>

                    <div>${$l("{0} Items", items.size.toString())}</div>

                </div>

                <div class="tag flex tap" @click=${() => app.syncVault(vault)}>

                    <pl-icon icon="refresh"></pl-icon>

                    <div>${formatDateFromNow(vault.revision.date)}</div>

                </div>

            </div>

            <h2 ?hidden=${!invites.length} class="animate">

                <pl-icon icon="mail"></pl-icon>

                <div>${$l("Invites")}</div>

            </h2>

            ${invites.map(async inv => {
                const status = inv.expired
                    ? { icon: "time", class: "warning", text: $l("expired") }
                    : inv.accepted
                        ? { icon: "check", class: "highlight", text: $l("accepted") }
                        : { icon: "time", class: "", text: $l("expires {0}", await formatDateFromNow(inv.expires)) };

                return html`
                <div class="invite layout align-center tap animate" @click=${() => this._showInvite(inv)}>

                    <div flex>

                        <div class="invite-email">${inv.email}</div> 

                        <div class="tags small">

                            <div class="tag ${status.class}">

                                <pl-icon icon="${status.icon}"></pl-icon>

                                <div>${status.text}</div>

                            </div>

                        </div>

                    </div>

                    <div class="invite-code">

                        <div class="invite-code-label">${$l("Confirmation Code:")}</div>

                        <div class="invite-code-value">${inv.secret}</div>

                    </div>

                </div>
            `;
            })}

            <h2 class="animate">

                <pl-icon icon="admins"></pl-icon>

                <div class="flex">${$l("Admins")}</div>

            </h2>

            <ul>

                    ${admins.map(
                        acc => html`
                        <li>

                            <pl-account-item .account=${acc} class="flex"> </pl-account-item>

                        </li>
                        `
                    )}

            </ul>

            <h2 class="animate">

                <pl-icon icon="group"></pl-icon>

                <div class="flex">${$l("Members")}</div>

                <pl-icon
                    icon="add"
                    class="add-icon tap"
                    @click=${() => this._addMember()}
                    ?hidden=${vault === app.mainVault || !permissions.manage}
                    ?disabled=${this.parentVault && vault.members.size === this.parentVault.members.size}>
                ></pl-icon>

            </h2>

            <ul>

                ${nonAdmins.map(
                    acc => html`
                        <li>

                            <pl-account-item .account=${acc} class="flex"> </pl-account-item>

                            <pl-icon
                                icon="remove"
                                class="remove-button tap"
                                ?hidden=${acc.id === app.account!.id || !permissions.manage}
                                @click=${() => this._removeMember(acc)}>
                            </pl-icon>

                        </li>
                    `
                )}

            </ul>

            <h2 class="animate"
                ?hidden=${vault === app.mainVault || !!vault.parent || (!permissions.manage && !subvaults.length)}>

                <pl-icon icon="vaults"></pl-icon>

                <div class="flex">${$l("Subvaults")}</div>

                <pl-icon
                    icon="add"
                    class="add-icon tap"
                    @click=${() => this._addSubVault()}
                    ?hidden=${vault === app.mainVault || !permissions.manage}>
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
       `;
    }
}
