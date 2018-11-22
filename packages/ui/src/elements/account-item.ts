import { VaultMember } from "@padlock/core/lib/vault.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { shared, mixins } from "../styles";
import { BaseElement, element, html, property } from "./base.js";

@element("pl-account-item")
export class AccountItem extends BaseElement {
    @property()
    account: VaultMember | null = null;

    shouldUpdate() {
        return !!this.account;
    }

    render() {
        const account = this.account!;
        const pills = [];

        account.permissions.read && pills.push({ icon: "check", label: $l("read") });
        account.permissions.write && pills.push({ icon: "check", label: $l("write") });
        account.permissions.manage && pills.push({ icon: "check", label: $l("manage") });

        return html`
            ${shared}

            <style>

                :host {
                    height: 80px;
                    display: flex;
                    align-items: center;
                }

                pl-fingerprint {
                    color: var(--color-secondary);
                    --color-background: var(--color-tertiary);
                    width: 46px;
                    height: 46px;
                    border-radius: 100%;
                    border: solid 1px var(--border-color);
                    margin: 15px;
                }

                .account-info {
                    flex: 1;
                    padding-right: 18px;
                }

                .account-email {
                    ${mixins.ellipsis()}
                }

                .account-email {
                    font-weight: bold;
                    ${mixins.ellipsis()}
                }
            </style>

            <pl-fingerprint .key=${account.publicKey}></pl-fingerprint>

            <div class="account-info">

                <div class="account-name">${account.name}</div>

                <div class="account-email">${account.email}</div>

            </div>
        `;
    }
}
