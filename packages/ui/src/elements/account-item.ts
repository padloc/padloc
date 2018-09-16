import { GroupMember } from "@padlock/core/lib/group.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { app } from "../init.js";
import { shared, mixins } from "../styles";
import { BaseElement, element, html, property } from "./base.js";

@element("pl-account-item")
export class AccountItem extends BaseElement {
    @property() account: GroupMember | null = null;

    shouldUpdate() {
        return !!this.account;
    }

    render() {
        const account = this.account!;
        const pills = [];

        switch (account.status) {
            case "active":
                account.permissions.read && pills.push({ icon: "check", label: $l("read") });
                account.permissions.write && pills.push({ icon: "check", label: $l("write") });
                account.permissions.manage && pills.push({ icon: "check", label: $l("manage") });
                break;
            default:
                const commonStores = app.stores.filter(s => s.isMember(account!));
                if (commonStores.length) {
                    pills.push({ icon: "group", label: $l("{0} common groups", commonStores.length.toString()) });
                }
        }

        return html`
            ${shared}

            <style>

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
                    ${mixins.ellipsis()}
                }
            </style>

            <pl-fingerprint .key=${account.publicKey}></pl-fingerprint>

            <div class="account-info">

                <div class="account-email">${account.email}</div>

                <div class="tags small">

                    ${pills.map(
                        pill => html`
                            <div class="tag">

                                <pl-icon icon="${pill.icon}"></pl-icon>

                                <div>${pill.label}</div>

                            </div>`
                    )}

                </div>

            </div>
        `;
    }
}
