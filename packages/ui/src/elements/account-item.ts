import { Accessor } from "@padlock/core/lib/crypto.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { app } from "../init.js";
import sharedStyles from "../styles/shared.js";
import { BaseElement, element, html, property } from "./base.js";

@element("pl-account-item")
export class AccountItem extends BaseElement {
    @property() account: Accessor | null = null;

    _shouldRender() {
        return !!this.account;
    }

    _render({ account }: this) {
        account = account!;
        const pills = [];

        switch (account.status) {
            case "active":
            case "invited":
                account.permissions.read && pills.push({ icon: "check", label: $l("read") });
                account.permissions.write && pills.push({ icon: "check", label: $l("write") });
                account.permissions.manage && pills.push({ icon: "check", label: $l("manage") });
                break;
            case "requested":
                pills.push({ icon: "time", label: $l("access requested"), class: "highlight" });
                break;
            default:
                if (app.isTrusted(account)) {
                    pills.push({ icon: "trusted", label: $l("trusted") });
                }
                const commonStores = app.sharedStores.filter(s =>
                    s.accessors.some(a => a.email === account!.email && a.status === "active")
                );
                if (commonStores.length) {
                    pills.push({ icon: "group", label: $l("{0} common groups", commonStores.length.toString()) });
                }
        }

        return html`
            <style>
                ${sharedStyles}

                :host {
                    height: 80px;
                    display: flex;
                    align-items: center;
                }

                pl-fingerprint {
                    width: 50px;
                    height: 50px;
                    border-radius: 100%;
                    border: solid 1px var(--border-color);
                    margin: 15px;
                }

                .account-info {
                    flex: 1;
                    width: 0;
                }

                .account-email {
                    font-weight: bold;
                    margin: 5px 0;
                    @apply --ellipsis;
                }
            </style>

            <pl-fingerprint key="${account.publicKey}"></pl-fingerprint>

            <div class="account-info">

                <div class="account-email">${account.email}</div>

                <div class="tags small">

                    ${pills.map(
                        pill => html`
                            <div class$="tag ${pill.class || ""}">

                                <pl-icon icon="${pill.icon}"></pl-icon>

                                <div>${pill.label}</div>

                            </div>`
                    )}

                </div>

            </div>
        `;
    }
}
