import { SharedStore } from "@padlock/core/lib/data.js";
import { PublicAccount } from "@padlock/core/lib/auth.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import sharedStyles from "../styles/shared.js";
import { getDialog, choose, prompt, confirm, alert } from "../dialog.js";
import { animateCascade } from "../animation.js";
import { app } from "../init.js";
import { element, html, property, listen } from "./base.js";
import { View } from "./view.js";
import "./icon.js";
import "./account-dialog.js";
import "./invite-dialog.js";

@element("pl-store-view")
export class StoreView extends View {
    @property() store: SharedStore | null = null;

    @listen("synchronize", app)
    @listen("store-changed", app)
    _refresh() {
        this.requestRender();
    }

    _activated() {
        animateCascade(this.$$(".animate:not([hidden])", false), { initialDelay: 200 });
    }

    _shouldRender() {
        return !!this.store;
    }

    _render({ store }: this) {
        const { name, accessors, permissions, currentAccessor, records } = store!;
        const accounts = accessors.filter(a => a.status !== "removed");
        const accessorStatus = currentAccessor ? currentAccessor.status : "";

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

            .account-wrapper {
                @apply --card;
                display: flex;
                margin: 6px;
            }

            pl-account-item {
                flex: 1;
            }

            .account-wrapper pl-icon {
                align-self: stretch;
                height: auto;
                width: 60px;
            }
        </style>

        <header>

            <pl-icon icon="close" class="tap" on-click="${() => this._back()}"></pl-icon>

            <div class="title">${name}</div>

            <pl-icon
                icon="invite"
                class="tap"
                on-click="${() => this._invite()}"
                invisible?="${!permissions.manage}">
            </pl-icon>

        </header>

        <main>

            <div class="tags animate" hidden?="${accessorStatus !== "active"}">

                <div class="tag warning" hidden?="${permissions.write}">

                    <pl-icon icon="show"></pl-icon>

                    <div>${$l("read-only")}</div>

                </div>

                <div class="tag" hidden?="${accessorStatus === "removed"}">

                    <pl-icon icon="group"></pl-icon>

                    <div>${accounts.length}</div>

                </div>

                <div class="tag" hidden?="${accessorStatus === "removed"}">

                    <pl-icon icon="record"></pl-icon>

                    <div>${records.length}</div>

                </div>

            </div>

            <div class="tags animate" hidden?="${accessorStatus !== "removed"}">

                <div class="tag warning" flex>${$l("Access Revoked")}</div>

            </div>

            <div class="tags animate" hidden?="${accessorStatus !== "invited"}">

                <div class="tag highlight ellipsis" flex>${$l("invited by {0}", currentAccessor.addedBy)}</div>

                <div class="tag ghost tap" on-click="${() => this._join()}">

                    <pl-icon icon="group"></pl-icon>

                    <div>${$l("Join Group")}</div>

                </div>

            </div>

            ${accounts.map(
                acc => html`
                    <div class="account-wrapper animate">
                        <pl-account-item
                            account="${acc}"
                            class="tap"
                            on-click="${() => this._openAccount(acc)}">
                        </pl-account-item>
                        <pl-icon
                            icon="removeuser"
                            class="tap"
                            hidden?="${!permissions.manage || acc.email === app.account!.email}"
                            on-click="${() => this._removeAccount(acc)}">
                        </pl-icon>
                    </div>
                `
            )}

        </main>

        <div class="rounded-corners"></div>
       `;
    }

    private async _invite() {
        await getDialog("pl-invite-dialog").show(this.store);
        this.requestRender();
    }

    private async _openAccount(account: PublicAccount) {
        await getDialog("pl-account-dialog").show(account);
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
    //
    // private async _more() {
    //     const choice = await choose("", [$l("Invite New User..."), $l("Delete Group...")]);
    //
    //     switch (choice) {
    //         case 0:
    //             this._invite();
    //             break;
    //         case 1:
    //             this._delete();
    //             break;
    //     }
    // }

    private async _removeAccount(account: PublicAccount) {
        const confirmed = await confirm(
            $l("Are you sure you want to remove this user from the group?"),
            $l("Remove User")
        );

        if (confirmed) {
            await app.removeAccount(this.store!, account);
            this.requestRender();
        }
    }

    private async _join() {
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
            await app.joinStore(this.store!);
        }
    }
}
