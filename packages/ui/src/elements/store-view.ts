import { SharedStore } from "@padlock/core/lib/data.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { Accessor } from "@padlock/core/lib/crypto.js";
import sharedStyles from "../styles/shared.js";
import { getDialog, confirm, alert } from "../dialog.js";
import { animateCascade } from "../animation.js";
import { app, router } from "../init.js";
import { element, html, property, listen } from "./base.js";
import { View } from "./view.js";
import "./icon.js";
import "./accessor-dialog.js";
import { InviteDialog } from "./invite-dialog.js";
import "./invite-dialog.js";
import { ShareStoreDialog } from "./share-store-dialog.js";
import "./share-store-dialog.js";

@element("pl-store-view")
export class StoreView extends View {
    @property() store: SharedStore | null = null;

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
        if (this.store && this.store.accessors.length === 1 && this.store.permissions.manage) {
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
        const accounts = app.mainStore.trustedAccounts.filter(
            acc => !this.store!.accessors.some(a => a.email === acc.email && a.status === "active")
        );

        const selection = accounts.length ? await this._inviteDialog.show(this.store!) : "new";

        if (selection === "new") {
            this._shareStoreDialog.show(this.store!);
        } else if (selection !== null) {
            this._openAccessor(
                Object.assign(
                    {
                        status: "none" as "none",
                        encryptedKey: "",
                        addedBy: "",
                        updated: "",
                        permissions: { read: true, write: false, manage: false }
                    },
                    selection
                )
            );
        }
    }

    private async _openAccessor(accessor: Accessor) {
        await getDialog("pl-accessor-dialog").show(accessor, this.store);
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

    private async _requestAccess() {
        await app.requestAccess(this.store!);
    }

    private async _acceptInvite() {
        let confirmed = false;
        const { accessors, currentAccessor, name } = this.store!;
        const addedBy = accessors.find(a => a.email === currentAccessor.addedBy);
        if (!app.isTrusted(addedBy)) {
            await alert(
                $l(
                    "You were invited to this group by {0}, who is not among your trusted users yet. " +
                        "You'll have to add him to your trusted users first before you can join this store",
                    addedBy.email
                ),
                { options: [$l("Continue")], preventDismiss: true }
            );
            confirmed = await getDialog("pl-account-dialog").show(addedBy, $l("Join {0}", name));
        } else {
            confirmed = await confirm($l("Do you want to join this group?", this.store!.name), $l("Join"));
        }

        if (confirmed) {
            await app.acceptInvite(this.store!);
        }
    }

    _shouldRender() {
        return !!this.store;
    }

    _render({ store }: this) {
        const { name, accessors, permissions, currentAccessor, accessorStatus, records } = store!;
        const statuses = ["requested", "invited", "active"];
        const accounts = accessors
            .filter(({ status }) => statuses.includes(status))
            .sort((a, b) => statuses.indexOf(a.status) - statuses.indexOf(b.status));
        const addedBy = currentAccessor && currentAccessor.addedBy;

        return html`
        <style>
            ${sharedStyles}


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

            <div class="subheader warning animate ellipsis" hidden?="${accessorStatus !== "removed"}">
                <div flex>${$l("You have been removed from this group")}</div>
            </div>

            <div class="subheader highlight animate ellipsis" hidden?="${accessorStatus !== "requested"}">
                <div flex>${$l("Access Request Sent")}</div>
            </div>

            <div class="subheader warning animate ellipsis" hidden?="${accessorStatus !== "rejected"}">
                <div flex>${$l("Access Request Rejected")}</div>
            </div>

            <div class="subheader highlight animate" hidden?="${accessorStatus !== "invited"}">

                <div class="subheader-label ellipsis" flex>${$l("Invited By {0}", addedBy)}</div>

                <button class="tap" on-click="${() => this._acceptInvite()}">
                    ${$l("Join Group")}
                </div>

            </div>

            <div
                class="subheader warning animate tap"
                hidden?="${accessorStatus !== "none"}"
                on-click="${() => this._requestAccess()}">

                <div class="subheader-label ellipsis" flex>${$l("You are not a member of this group.")}</div>

                <button>
                    ${$l("Request Access")}
                </button>

            </div>

            <div class="tags animate">

                <div class="tag warning" flex hidden?="${accessorStatus !== "active" || permissions.write}">

                    <pl-icon icon="show"></pl-icon>

                    <div>${$l("read-only")}</div>

                </div>

                <div class="tag" flex hidden?="${accessorStatus === "removed"}">

                    <pl-icon icon="group"></pl-icon>

                    <div>${$l("{0} Members", accounts.length.toString())}</div>

                </div>

                <div class="tag" flex hidden?="${accessorStatus === "removed"}">

                    <pl-icon icon="record"></pl-icon>

                    <div>${$l("{0} Records", records.length.toString())}</div>

                </div>

            </div>

            ${accounts.map(
                acc => html`
                    <pl-account-item
                        account="${acc}"
                        class="animate tap"
                        on-click="${() => this._openAccessor(acc)}">
                    </pl-account-item>
                `
            )}

        </main>

        <div class="rounded-corners"></div>
       `;
    }
}
