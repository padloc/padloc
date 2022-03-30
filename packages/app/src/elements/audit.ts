import { translate as $l } from "@padloc/locale/src/translate";
import { FieldType, VaultItem, Field, AuditResult, AuditResultType } from "@padloc/core/src/item";
import { Vault } from "@padloc/core/src/vault";
import { customElement, state, queryAll } from "lit/decorators.js";
import { css, html } from "lit";
import { getCryptoProvider } from "@padloc/core/src/platform";
import { HashParams } from "@padloc/core/src/crypto";
import { stringToBytes, bytesToHex } from "@padloc/core/src/encoding";
import { sub } from "date-fns";

import { app } from "../globals";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { animateElement } from "../lib/animation";
import { passwordStrength } from "../lib/util";
import { View } from "./view";
import { ListItem } from "./items-list";

@customElement("pl-audit")
export class Audit extends StateMixin(Routing(View)) {
    readonly routePattern = /^audit/;

    @state()
    private _reusedPasswords: ListItem[] = [];

    @state()
    private _weakPasswords: ListItem[] = [];

    @state()
    private _compromisedPasswords: ListItem[] = [];

    @queryAll("pl-audit-list-item")
    private _countElements: HTMLDivElement[];

    handleRoute() {
        this.audit();
    }

    shouldUpdate() {
        return !!app.account;
    }

    static styles = [
        ...View.styles,
        css`
            .counts {
                display: grid;
                grid-gap: 1em;
                margin: 1em;
                grid-template-columns: repeat(auto-fit, minmax(20em, 1fr));
            }

            @media (max-width: 700px) {
                .counts {
                    grid-template-columns: repeat(auto-fit, minmax(15em, 1fr));
                }
            }
        `,
    ];

    render() {
        const { _reusedPasswords, _weakPasswords, _compromisedPasswords } = this;

        return html`
            <div class="fullbleed vertical layout">
                <header class="padded spacing center-aligning horizontal layout">
                    <pl-button
                        class="transparent skinny menu-button header-title"
                        @click=${() =>
                            this.dispatchEvent(new CustomEvent("toggle-menu", { composed: true, bubbles: true }))}
                    >
                        <div class="half-margined horizontal spacing center-aligning layout text-left-aligning">
                            <pl-icon icon="shield-check"></pl-icon>
                            <div class="stretch ellipsis">${$l("Password Audit")}</div>
                        </div>
                    </pl-button>
                </header>
                <div class="layout padded">
                    <div class="vertical spacing">
                        <pl-scroller class="stretch">
                            <div class="counts">
                                ${this._renderSection(_reusedPasswords, $l("Reused Passwords"), {
                                    audit: AuditResultType.ReusedPassword,
                                })}
                                ${this._renderSection(_weakPasswords, $l("Weak Passwords"), {
                                    audit: AuditResultType.WeakPassword,
                                })}
                                ${this._renderSection(_compromisedPasswords, $l("Compromised Passwords"), {
                                    audit: AuditResultType.CompromisedPassword,
                                })}
                            </div>
                        </pl-scroller>
                    </div>
                </div>
            </div>
        `;
    }

    async audit() {
        const { vaults } = this.state;

        const { reusedPasswords, weakPasswords, compromisedPasswords } = await auditVaults(vaults);

        // This makes the UI update
        this._reusedPasswords = reusedPasswords;
        this._weakPasswords = weakPasswords;
        this._compromisedPasswords = compromisedPasswords;

        this._countElements.forEach((countElement) => {
            animateElement(countElement, { animation: "bounce" });
        });
    }

    private _renderSection(listItems: ListItem[], label: string, routeParams: any) {
        return html`
            <section class="box count" ?hidden=${listItems.length === 0}>
                <h2 class="uppercase bg-dark border-bottom semibold center-aligning spacing horizontal layout">
                    <div></div>
                    <div>${label}</div>
                    <div class="tiny bold tag">${listItems.length}</div>
                    <div class="stretch"></div>
                </h2>
                <pl-list>
                    ${listItems.slice(0, 5).map(
                        (listItem) => html`
                            <div class="list-item hover click" @click=${() => this.go(`items/${listItem.item.id}`)}>
                                <pl-vault-item-list-item
                                    .item=${listItem.item}
                                    .vault=${listItem.vault}
                                    class="stretch collapse"
                                ></pl-vault-item-list-item>
                            </div>
                        `
                    )}
                </pl-list>
                <pl-button
                    class="slim margined transparent"
                    @click=${() => this.go("items", routeParams)}
                    ?hidden=${listItems.length < 6}
                >
                    <div>${$l("Show All")}</div>
                    <pl-icon icon="arrow-right" class="small left-margined"></pl-icon>
                </pl-button>
            </section>
        `;
    }
}

async function sha1(password: string) {
    const hashedPasswordData = await getCryptoProvider().hash(
        stringToBytes(password),
        new HashParams({ algorithm: "SHA-1" })
    );
    const hashedPassword = bytesToHex(hashedPasswordData);
    return hashedPassword;
}

async function isPasswordWeak(password: string) {
    const { score } = await passwordStrength(password);

    return score < 2;
}

async function hasPasswordBeenCompromised(passwordHash: string) {
    const hashPrefix = passwordHash.slice(0, 5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${hashPrefix}`);

    const result = await response.text();

    const matchingHashSuffixes = result.split("\r\n");

    for (const matchingHashSuffix of matchingHashSuffixes) {
        const fullLowercaseHash = `${hashPrefix}${matchingHashSuffix.toLowerCase().split(":")[0]}`;

        if (fullLowercaseHash === passwordHash) {
            return true;
        }
    }

    return false;
}

export async function auditVaults(
    vaults: Vault[],
    {
        updateOnlyItemWithId,
        updateOnlyIfOutdated,
    }: { updateOnlyItemWithId?: string; updateOnlyIfOutdated?: boolean } = {}
) {
    const reusedPasswords: ListItem[] = [];
    const weakPasswords: ListItem[] = [];
    const compromisedPasswords: ListItem[] = [];

    const firstMatchPerPasswordHash = new Map<
        string,
        { item: VaultItem; vault: Vault; passwordField: { field: Field; fieldIndex: number } }
    >();
    const reusedPasswordItemIds: Set<string> = new Set();
    const weakPasswordItemIds: Set<string> = new Set();
    const compromisedPasswordItemIds: Set<string> = new Set();

    const oneWeekAgo = sub(new Date(), { weeks: 1 });

    // TODO: Remove this
    console.log(`Running audit! ${JSON.stringify({ updateOnlyItemWithId, updateOnlyIfOutdated })}`);

    for (const vault of vaults) {
        for (const item of vault.items) {
            if (updateOnlyItemWithId) {
                if (item.id !== updateOnlyItemWithId) {
                    // TODO: Remove this
                    console.log("Skipped, not the matching item.");
                    continue;
                }
            }

            if (updateOnlyIfOutdated && item.lastAudited && item.lastAudited >= oneWeekAgo) {
                // TODO: Remove this
                console.log("Skipped, already up to date.");
                continue;
            }

            const passwordFields = item.fields
                .map((field, fieldIndex) => ({ field, fieldIndex }))
                .filter((field) => field.field.type === FieldType.Password);

            // If an item had password fields that failed audits and were since removed, we need to run the audit again to clear and update it
            const itemHasFailedAudits = (item.auditResults || []).length > 0;

            if (passwordFields.length === 0 && !itemHasFailedAudits) {
                continue;
            }

            const auditResults: AuditResult[] = [];

            for (const passwordField of passwordFields) {
                const passwordHash = await sha1(passwordField.field.value);

                // Perform reused audit
                if (firstMatchPerPasswordHash.has(passwordHash)) {
                    // Don't add the same item twice to the list, if there are more than one reused password fields in it
                    if (!reusedPasswordItemIds.has(item.id)) {
                        reusedPasswords.push({ item, vault });
                        reusedPasswordItemIds.add(item.id);
                    }

                    auditResults.push({
                        type: AuditResultType.ReusedPassword,
                        fieldIndex: passwordField.fieldIndex,
                    });

                    // Also tag the first matching item as reused, once
                    const firstMatch = firstMatchPerPasswordHash.get(passwordHash)!;
                    if (!reusedPasswordItemIds.has(firstMatch.item.id)) {
                        reusedPasswords.push({ item: firstMatch.item, vault: firstMatch.vault });
                        reusedPasswordItemIds.add(firstMatch.item.id);

                        auditResults.push({
                            type: AuditResultType.ReusedPassword,
                            fieldIndex: firstMatch.passwordField.fieldIndex,
                        });
                    }
                }

                firstMatchPerPasswordHash.set(passwordHash, { item, vault, passwordField });

                // Perform weak audit
                const isThisPasswordWeak = await isPasswordWeak(passwordField.field.value);
                if (isThisPasswordWeak) {
                    // Don't add the same item twice to the list, if there are more than one weak password fields in it
                    if (!weakPasswordItemIds.has(item.id)) {
                        weakPasswords.push({ item, vault });
                        weakPasswordItemIds.add(item.id);
                    }

                    auditResults.push({ type: AuditResultType.WeakPassword, fieldIndex: passwordField.fieldIndex });
                }

                // Perform compromised audit
                const isPasswordCompromised = await hasPasswordBeenCompromised(passwordHash);
                if (isPasswordCompromised) {
                    // Don't add the same item twice to the list, if there are more than one compromised password fields in it
                    if (!compromisedPasswordItemIds.has(item.id)) {
                        compromisedPasswords.push({ item, vault });
                        compromisedPasswordItemIds.add(item.id);
                    }

                    auditResults.push({
                        type: AuditResultType.CompromisedPassword,
                        fieldIndex: passwordField.fieldIndex,
                    });
                }
            }

            item.auditResults = auditResults;
            item.lastAudited = new Date();
            vault.items.update(item);
        }

        await app.saveVault(vault);
    }

    await app.save();

    return {
        reusedPasswords,
        weakPasswords,
        compromisedPasswords,
    };
}
