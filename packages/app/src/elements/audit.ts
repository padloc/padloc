import { translate as $l } from "@padloc/locale/src/translate";
import { FieldType, VaultItem, Field } from "@padloc/core/src/item";
import { Vault } from "@padloc/core/src/vault";
import { customElement, state, queryAll } from "lit/decorators.js";
import { css, html } from "lit";

import { app } from "../globals";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { animateElement } from "../lib/animation";
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
                                    auditReused: "true",
                                })}
                                ${this._renderSection(_weakPasswords, $l("Weak Passwords"), { auditWeak: "true" })}
                                ${this._renderSection(_compromisedPasswords, $l("Compromised Passwords"), {
                                    auditCompromised: "true",
                                })}
                            </div>
                        </pl-scroller>
                    </div>
                </div>
            </div>
        `;
    }

    async audit() {
        const reusedPasswords: ListItem[] = [];
        const weakPasswords: ListItem[] = [];
        const compromisedPasswords: ListItem[] = [];

        const { vaults } = this.state;

        const firstMatchPerPasswordHash: {
            [passwordHash: string]: { item: VaultItem; vault: Vault; passwordField: Field };
        } = {};
        const reusedPasswordItemIds: Set<string> = new Set();
        const weakPasswordItemIds: Set<string> = new Set();
        // const compromisedPasswordItemIds: Set<string> = new Set();

        for (const vault of vaults) {
            for (const item of vault.items) {
                const passwordFields = item.fields.filter((field) => field.type === FieldType.Password);

                if (passwordFields.length === 0) {
                    continue;
                }

                let isReused = false;
                let isWeak = false;
                // let isCompromised = false;

                for (const passwordField of passwordFields) {
                    const passwordHash = await sha1(passwordField.value);

                    // Perform reused audit
                    if (Object.keys(firstMatchPerPasswordHash).includes(passwordHash)) {
                        isReused = true;

                        // Don't add the same item twice to the list, if there are more than one reused password fields in it
                        if (!reusedPasswordItemIds.has(item.id)) {
                            reusedPasswords.push({ item, vault });
                            reusedPasswordItemIds.add(item.id);
                        }

                        // TODO: Save audit match boolean in field
                        // passwordField.auditResult = { ...(passwordField.auditResult || {}), isReused };

                        // Also tag the first matching item as reused, once
                        const firstMatch = firstMatchPerPasswordHash[passwordHash];
                        if (!reusedPasswordItemIds.has(firstMatch.item.id)) {
                            reusedPasswords.push({ item: firstMatch.item, vault: firstMatch.vault });
                            reusedPasswordItemIds.add(firstMatch.item.id);

                            // TODO: Save audit match boolean in field
                            // firstMatch.passwordField.auditResult = { ...(firstMatch.passwordField.auditResult || {}), isReused };
                        }
                    }

                    firstMatchPerPasswordHash[passwordHash] = { item, vault, passwordField };

                    // Perform weak audit
                    if (isPasswordWeak(passwordField.value)) {
                        isWeak = true;

                        // Don't add the same item twice to the list, if there are more than one reused password fields in it
                        if (!weakPasswordItemIds.has(item.id)) {
                            weakPasswords.push({ item, vault });
                            weakPasswordItemIds.add(item.id);
                        }

                        // TODO: Save audit match boolean in field
                        // passwordField.auditResult = { ...(passwordField.auditResult || {}), isWeak };
                    }

                    // TODO: Perform compromised audit
                }

                // TODO: Save audit match booleans in item
                // item.auditResult = { lastAudited: new Date(), isReused, isWeak, isCompromised };

                console.log({ item, isReused, isWeak });
            }
        }

        // TODO: Sync?

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

async function sha1(stringToHash: string) {
    const hashedPasswordData = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(stringToHash));

    const hashedPassword = Array.from(new Uint8Array(hashedPasswordData))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

    return hashedPassword;
}

function isPasswordWeak(password: string) {
    if (password.length < 8) {
        return true;
    }

    // If there's only digits or only letters and it's less than 20 chars in length, it's weak
    if ((/^[0-9]+$/.test(password) || /^[a-zA-Z]+$/.test(password)) && password.length < 20) {
        return true;
    }

    return false;
}
