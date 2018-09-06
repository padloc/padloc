import { Store } from "@padlock/core/lib/store.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { GroupMember } from "@padlock/core/lib/group.js";
import { shared } from "../styles";
import { getDialog, confirm } from "../dialog.js";
import { animateCascade } from "../animation.js";
import { app, router } from "../init.js";
import { element, html, property, listen } from "./base.js";
import { View } from "./view.js";
import "./icon.js";
import "./member-dialog.js";
import { InviteDialog } from "./invite-dialog.js";
import "./invite-dialog.js";
import { ShareStoreDialog } from "./share-store-dialog.js";
import "./share-store-dialog.js";

@element("pl-store-view")
export class StoreView extends View {
    @property() store: Store | null = null;

    private get _inviteDialog() {
        return getDialog("pl-invite-dialog") as InviteDialog;
    }

    private get _shareStoreDialog() {
        return getDialog("pl-share-store-dialog") as ShareStoreDialog;
    }

    @listen("synchronize", app)
    @listen("store-changed", app)
    _refresh() {
        this.requestRender();
        this.$$("pl-account-item", false).forEach((el: any) => el.requestRender());
    }

    async _activated() {
        animateCascade(this.$$(".animate:not([hidden])", false), { initialDelay: 200 });
        if (this.store && this.store.members.length === 1 && this.store.getPermissions().manage) {
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
        const accounts = app.knownAccounts.filter(
            acc =>
                acc.id !== app.account!.id &&
                !this.store!.members.some(a => a.email === acc.email && a.status === "active")
        );

        const selection = accounts.length ? await this._inviteDialog.show(accounts) : "new";

        if (selection === "new") {
            this._shareStoreDialog.show(this.store!);
        } else if (selection !== null) {
            // TODO
            // this._showMember(
            //     Object.assign(
            //         {
            //             status: "none" as "none",
            //             encryptedKey: "",
            //             updatedBy: "",
            //             updated: "",
            //             permissions: { read: true, write: false, manage: false }
            //         },
            //         selection
            //     )
            // );
        }
    }

    private async _showMember(member: GroupMember) {
        await getDialog("pl-member-dialog").show(member, this.store);
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

            .subheader.highlight{
                background: linear-gradient(90deg, #59c6ff 0%, #077cb9 100%);
                text-shadow: rgba(0, 0, 0, 0.1) 0 1px 0;
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
