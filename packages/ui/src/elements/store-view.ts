import { Store } from "@padlock/core/lib/store.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { GroupMember } from "@padlock/core/lib/group.js";
import { Invite } from "@padlock/core/lib/invite.js";
import { formatDateFromNow } from "@padlock/core/lib/util.js";
import { shared } from "../styles";
import { getDialog, confirm, prompt } from "../dialog.js";
import { animateCascade } from "../animation.js";
import { app, router } from "../init.js";
import { element, html, property, listen } from "./base.js";
import { View } from "./view.js";
import "./icon.js";
import { MemberDialog } from "./member-dialog.js";
import "./member-dialog.js";
import { InviteDialog } from "./invite-dialog.js";
import "./invite-dialog.js";
import "./share-store-dialog.js";
import { Input } from "./input.js";

@element("pl-store-view")
export class StoreView extends View {
    @property() store: Store | null = null;

    private get _memberDialog() {
        return getDialog("pl-member-dialog") as MemberDialog;
    }

    private get _inviteDialog() {
        return getDialog("pl-invite-dialog") as InviteDialog;
    }

    @listen("synchronize", app)
    @listen("store-changed", app)
    _refresh() {
        this.requestRender();
        this.$$("pl-account-item", false).forEach((el: any) => el.requestRender());
    }

    async _activated() {
        animateCascade(this.$$(".animate:not([hidden])", false), { initialDelay: 200 });
        if (
            this.store &&
            this.store.members.length === 1 &&
            !this.store.invites.length &&
            this.store.getPermissions().manage
        ) {
            const confirmed = await confirm(
                $l(
                    "There is nobody else in this group yet. Invite others to give " +
                        "them access to any data you share with this group!"
                ),
                $l("Invite Others"),
                $l("Stay Lonely"),
                { icon: "group" }
            );
            if (confirmed) {
                this._invite();
            }
        }
    }

    private async _invite() {
        const email = await prompt($l("Who would you like to invite to this group?"), {
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

        const invite = await app.createInvite(this.store!, email);
        console.log(invite);
        await this._inviteDialog.show(invite);
    }

    private async _showMember(member: GroupMember) {
        await this._memberDialog.show(member, this.store!);
    }

    private async _showInvite(invite: Invite) {
        this._inviteDialog.show(invite);
    }

    // private async _delete() {
    //     const confirmed = await prompt($l("Are you sure you want to delete the '{0}' group?", this.store!.name), {
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
    //         await app.deleteSharedStore(this.store!.id);
    //         alert($l("Group deleted successfully"));
    //     }
    // }

    _shouldRender() {
        return !!this.store;
    }

    _render({ store }: this) {
        store = store!;
        const { name, members, collection } = store;
        const member = store.getMember();
        const memberStatus = member ? member.status : "";
        const permissions = store.getPermissions();
        const invites = store.isAdmin() ? store.invites : [];

        return html`
        ${shared}

        <style>

            :host {
                display: flex;
                flex-direction: column;
                @apply --fullbleed;
            }

            main {
                background: var(--color-quaternary);
            }

            .tags {
                padding: 0 8px;
            }

            pl-account-item {
                @apply --card;
                margin: 6px;
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
                background: linear-gradient(90deg, #f49300 0%, #f25b00 100%);
                text-shadow: rgba(0, 0, 0, 0.1) 0 1px 0;
            }

            .subheader.highlight {
                background: linear-gradient(90deg, #59c6ff 0%, #077cb9 100%);
                text-shadow: rgba(0, 0, 0, 0.1) 0 1px 0;
            }

            .invite {
                @apply --card;
                padding: 15px 17px;
                margin: 8px;
            }

            .invite .tags {
                padding: 0;
                margin: 0;
            }

            .invite-email {
                font-weight: bold;
                @apply --ellipsis;
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

            <pl-icon icon="close" class="tap" on-click="${() => router.go("")}"></pl-icon>

            <div class="title">${name}</div>

            <pl-icon
                icon="invite"
                class="tap"
                on-click="${() => this._invite()}"
                invisible?="${!permissions.manage}">
            </pl-icon>

        </header>

        <main>

            <div class="subheader warning animate ellipsis" hidden?="${memberStatus !== "removed"}">
                <div flex>${$l("You have been removed from this group")}</div>
            </div>

            <div class="tags animate">

                <div class="tag warning" flex hidden?="${memberStatus !== "active" || permissions.write}">

                    <pl-icon icon="show"></pl-icon>

                    <div>${$l("read-only")}</div>

                </div>

                <div class="tag" flex hidden?="${memberStatus === "removed"}">

                    <pl-icon icon="group"></pl-icon>

                    <div>${$l("{0} Members", members.length.toString())}</div>

                </div>

                <div class="tag" flex hidden?="${memberStatus === "removed"}">

                    <pl-icon icon="record"></pl-icon>

                    <div>${$l("{0} Records", collection.size.toString())}</div>

                </div>

            </div>

            <h2>

                <pl-icon icon="mail"></pl-icon>

                <div>${$l("Invites")}</div>

            </h2>

            ${invites.map(
                inv => html`
                <div layout align-center class="invite tap" on-click="${() => this._showInvite(inv)}">

                    <div flex>

                        <div class="invite-email">${inv.email}</div> 

                        <div class="tags small">

                            <div class="tag highlight" hidden?="${inv.expired || inv.status !== "accepted"}">

                                <pl-icon icon="check"></pl-icon>

                                <div>${$l("accepted")}</div>

                            </div>

                            <div class="tag warning" hidden?="${!inv.expired}">

                                <pl-icon icon="time"></pl-icon>

                                <div>${$l("expired")}</div>

                            </div>

                            <div class="tag" hidden?="${inv.expired}">

                                <pl-icon icon="time"></pl-icon>

                                <div>${$l("expires {0}", formatDateFromNow(inv.expires))}</div>

                            </div>

                        </div>

                    </div>

                    <div class="invite-code">

                        <div class="invite-code-label">${$l("Confirmation Code:")}</div>

                        <div class="invite-code-value">${inv.secret}</div>

                    </div>

                </div>
            `
            )}

            <h2>

                <pl-icon icon="group"></pl-icon>

                <div>${$l("Members")}</div>

            </h2>

            ${members.map(
                acc => html`
                    <pl-account-item
                        account="${acc}"
                        class="animate tap"
                        on-click="${() => this._showMember(acc)}">
                    </pl-account-item>
                `
            )}

        </main>

        <div class="rounded-corners"></div>
       `;
    }
}
