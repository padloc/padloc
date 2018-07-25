import { SharedStore } from "@padlock/core/lib/data.js";
import { PublicAccount } from "@padlock/core/lib/auth.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import sharedStyles from "../styles/shared.js";
import { choose, confirm, alert, getDialog } from "../dialog.js";
import { app } from "../init.js";
import { animateCascade } from "../animation.js";
import { element, html, property } from "./base.js";
import { View } from "./view.js";
import "./icon.js";
import "./account-dialog.js";

@element("pl-store-view")
export class StoreView extends View {
    @property() store: SharedStore | null = null;

    _activated() {
        animateCascade(this.$$("pl-account-item", false), { initialDelay: 200 });
    }

    _shouldRender() {
        return !!this.store;
    }

    _render({ store }: this) {
        const accounts = store!.accessors;
        const invites = store!.invites;

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

            pl-account-item {
                @apply --card;
                margin: 6px;
            }
        </style>

        <header>

            <pl-icon icon="close" class="tap" on-click="${() => this._back()}"></pl-icon>

            <div class="title">${store!.name}</div>

            <pl-icon icon="invite" class="tap" on-click="${() => this._invite()}"></pl-icon>

        </header>

        <main>

            ${accounts.map(
                acc => html`
                    <pl-account-item
                        account="${acc}"
                        class="tap"
                        on-click="${() => this._openAccount(acc)}">
                    </pl-account-item>`
            )}

            ${invites.map(
                ({ recipient }) => html`
                    <pl-account-item
                        account="${recipient}"
                        invited
                        class="tap"
                        on-click="${() => this._openAccount(recipient)}">
                    </pl-account-item>`
            )}

        </main>

        <div class="rounded-corners"></div>
       `;
    }

    async _invite() {
        const choice = await choose(
            $l("Who would you like to invite to this store?"),
            app.mainStore.trustedAccounts.map(a => a.email)
        );

        if (choice === -1) {
            return;
        }

        const account = app.mainStore.trustedAccounts[choice];

        const confirmed = confirm(
            $l(
                "Are you sure you want to invite {0} to this store " + "and give them access to all its contents?",
                account.email
            )
        );

        if (confirmed) {
            await app.createInvite(this.store!, account);
            alert(
                $l("Done! We sent an invite to {0}. Once they accept, they'll have access to this store", account.email)
            );
        }
    }

    async _openAccount(account: PublicAccount) {
        await getDialog("pl-account-dialog").show(account);
    }
}
