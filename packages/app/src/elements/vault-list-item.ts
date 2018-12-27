import { localize as $l } from "@padloc/core/lib/locale.js";
import { Vault } from "@padloc/core/lib/vault.js";
import { shared, mixins } from "../styles";
import { app } from "../init.js";
import { BaseElement, element, html, property } from "./base.js";

@element("pl-vault-list-item")
export class AccountItem extends BaseElement {
    @property()
    vault: Vault | null = null;

    shouldUpdate() {
        return !!this.vault;
    }

    render() {
        const vault = this.vault!;

        return html`
            ${shared}

            <style>

                :host {
                    height: 80px;
                    display: flex;
                    align-items: center;
                }

                pl-fingerprint {
                    width: 46px;
                    height: 46px;
                    border-radius: 100%;
                    margin: 15px;
                    background: var(--color-secondary);
                    color: var(--color-tertiary);
                    border: solid 2px var(--color-secondary);
                }

                .vault-info {
                    flex: 1;
                    width: 0;
                }

                .vault-name {
                    font-weight: bold;
                    margin: 5px 0;
                    ${mixins.ellipsis()}
                }

                :host(.subvault) pl-fingerprint {
                    width: 30px;
                    height: 30px;
                }

                :host(.subvault) .tags {
                    display: none;
                }

            </style>

            <pl-fingerprint .key=${vault.publicKey}></pl-fingerprint>

            <div class="vault-info">

                <div class="vault-name">${vault.name}</div>

                <div class="tags small">

                    <div class="tag warning" ?hidden=${!vault.archived}>

                        <pl-icon icon="archive"></pl-icon>

                        <div>${$l("archived")}</div>

                    </div>

                    <div class="tag">

                        <pl-icon icon="group"></pl-icon>

                        <div>${vault.members.size}</div>

                    </div>

                    <div class="tag" ?hidden=${vault === app.mainVault || !vault.vaults.size}>

                        <pl-icon icon="vaults"></pl-icon>

                        <div>${vault.vaults.size}</div>

                    </div>

                    <div class="tag">

                        <pl-icon icon="list"></pl-icon>

                        <div>${vault.items.size}</div>

                    </div>

                </div>

            </div>
        `;
    }
}
