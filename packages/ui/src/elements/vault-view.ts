import { localize as $l } from "@padlock/core/lib/locale.js";
import { Vault, VaultInfo, VaultMember } from "@padlock/core/lib/vault.js";
import { Invite } from "@padlock/core/lib/invite.js";
import { formatDateFromNow } from "../util.js";
import { shared, mixins } from "../styles";
import { dialog, confirm, prompt, alert } from "../dialog.js";
import { animateCascade } from "../animation.js";
import { app, router } from "../init.js";
import { BaseElement, element, html, property, listen } from "./base.js";
import { MemberDialog } from "./member-dialog.js";
import { InviteDialog } from "./invite-dialog.js";
import { SelectAccountDialog } from "./select-account-dialog.js";
import { Input } from "./input.js";
import "./account-item.js";
import "./icon.js";

@element("pl-vault-view")
export class VaultView extends BaseElement {
    @property()
    vault: Vault | null = null;

    @dialog("pl-member-dialog")
    private _memberDialog: MemberDialog;

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
        const email = await prompt($l("Who would you like to invite to this vault?"), {
            type: "email",
            placeholder: $l("Enter Email Address"),
            validate: async (val: string, input: Input) => {
                if (input.invalid) {
                    throw $l("Please enter a valid email address!");
                }
                return val;
            }
        });

        if (!email) {
            return;
        }

        if ([...this.vault!.members].some(m => m.email === email)) {
            await alert($l("This user is already a member!"), { type: "warning" });
            return;
        }

        const invite = await app.createInvite(this.vault!, email);
        console.log(invite);
        await this._inviteDialog.show(invite);
    }

    private async _addParentMember() {
        const parent = await app.getVault(this.vault!.parent!);
        const acc = await this._selectAccountDialog.show([...parent!.members].filter(m => !this.vault!.isMember(m)));
        await this.vault!.updateMember(acc, "active", {
            read: true,
            write: true,
            manage: false
        });
    }

    private async _addMember() {
        if (this.vault!.parent) {
            this._addParentMember();
        } else {
            this._invite();
        }
    }

    private async _showMember(member: VaultMember) {
        await this._memberDialog.show(member, this.vault!);
    }

    private async _showInvite(invite: Invite) {
        if (invite.email !== app.account!.email && invite.accepted && !invite.expired && (await invite.verify())) {
            await this._showMember({
                ...invite.invitee,
                status: "active",
                permissions: { read: true, write: false, manage: false }
            } as VaultMember);
            if (this.vault!.isMember(invite.invitee! as VaultMember)) {
                await app.deleteInvite(invite);
            }
        } else {
            await this._inviteDialog.show(invite);
        }
        app.syncVault(this.vault!);
    }

    private _openVault(vault: VaultInfo) {
        router.go(`vaults/${vault.id}`);
    }

    private async _addSubVault() {
        const vaultName = await prompt($l("Enter a vault name!"), {
            placeholder: $l("Vault Name"),
            confirmLabel: $l("Create")
        });
        if (vaultName) {
            app.createVault(vaultName, this.vault!);
        }
    }

    private async _removeMember(member: VaultMember) {
        const confirmed = await confirm(
            $l("Are you sure you want to remove {0} from this vault?", member.name || member.email)
        );

        if (confirmed) {
            await this.vault!.removeMember(member);
            await app.syncVault(this.vault!);
            this.requestUpdate();
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
        const subvaults = vault === app.mainVault ? [] : [...vaults].map(v => app._vaults.get(v.id));
        const member = vault.getMember(app.account!);
        const memberStatus = member ? member.status : "";
        const permissions = vault.getPermissions();
        const invites = vault.isAdmin() ? [...vault.invites] : [];
        const admins = [...members].filter(m => vault.isAdmin(m));
        const nonAdmins = [...members].filter(m => m.status === "active" && !vault.isAdmin(m));

        return html`
        ${shared}

        <style>

            :host {
                display: flex;
                flex-direction: column;
                background: var(--color-tertiary);
            }

            .tags {
                padding: 0 8px;
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

            .subheader {
                height: 35px;
                line-height: 35px;
                padding: 0 15px;
                width: 100%;
                box-sizing: border-box;
                font-size: var(--font-size-tiny);
                font-weight: bold;
                background: var(--color-foreground);
                color: var(--color-background);
                display: flex;
                text-align: center;
            }

            .subheader button {
                line-height: inherit;
                font-size: inherit;
                height: inherit;
                margin-right: -15px;
            }

            .subheader-label {
                font-weight: normal;
                text-align: left;
            }

            .subheader.warning {
                ${mixins.gradientWarning(true)}
                text-shadow: rgba(0, 0, 0, 0.1) 0 1px 0;
            }

            .subheader.highlight {
                ${mixins.gradientHighlight(true)}
                background: linear-gradient(90deg, #59c6ff 0%, #077cb9 100%);
                text-shadow: rgba(0, 0, 0, 0.1) 0 1px 0;
            }

            .invite {
                ${mixins.card()}
                padding: 15px 17px;
                margin: 8px;
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

        <header>

            <pl-icon icon="close" class="tap" @click=${() => router.go("")}></pl-icon>

            <div class="title">${name}</div>

        </header>

        <main>

            <div class="subheader warning animate ellipsis" ?hidden=${memberStatus !== "removed"}>

                <div flex>${$l("You have been removed from this vault")}</div>

            </div>

            <div class="tags animate">

                <div
                    class="tag highlight tap"
                    flex ?hidden=${!vault.parent}
                    @click=${() => this._openVault(vault.parent!)}>

                    <pl-icon icon="vault"></pl-icon>

                    <div>${vault.parent && vault.parent.name}</div>

                </div>

                <div class="tag warning" flex ?hidden=${memberStatus !== "active" || permissions.write}>

                    <pl-icon icon="show"></pl-icon>

                    <div>${$l("read-only")}</div>

                </div>

                <div class="tag" flex ?hidden=${memberStatus === "removed"}>

                    <pl-icon icon="group"></pl-icon>

                    <div>${$l("{0} Members", members.size.toString())}</div>

                </div>

                <div class="tag" flex ?hidden=${memberStatus === "removed"}>

                    <pl-icon icon="record"></pl-icon>

                    <div>${$l("{0} Records", items.size.toString())}</div>

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
                    ?hidden=${vault === app.mainVault || !permissions.manage}>
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
                                @click=${() => this._removeMember(acc)}>
                            </pl-icon>

                        </li>
                    `
                )}

            </ul>

            <h2 class="animate" ?hidden=${vault === app.mainVault || !!vault.parent || !permissions.manage}>

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
