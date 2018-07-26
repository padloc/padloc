import { SharedStore } from "@padlock/core/lib/data.js";
import { PublicAccount } from "@padlock/core/lib/auth.js";
import sharedStyles from "../styles/shared.js";
import { getDialog } from "../dialog.js";
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
    _refresh() {
        this.requestRender();
    }

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
                invite => html`
                    <pl-account-item
                        account="${invite.recipient}"
                        invite="${invite}"
                        class="tap"
                        on-click="${() => this._openAccount(invite.recipient)}">
                    </pl-account-item>`
            )}

        </main>

        <div class="rounded-corners"></div>
       `;
    }

    async _invite() {
        await getDialog("pl-invite-dialog").show(this.store);
        this.requestRender();
    }

    async _openAccount(account: PublicAccount) {
        await getDialog("pl-account-dialog").show(account);
    }
}
