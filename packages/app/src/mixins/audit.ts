import { FieldType, VaultItem, Field, AuditResult, AuditResultType } from "@padloc/core/src/item";
import { Vault } from "@padloc/core/src/vault";
import { LitElement } from "lit";
import { getCryptoProvider } from "@padloc/core/src/platform";
import { HashParams } from "@padloc/core/src/crypto";
import { stringToBytes, bytesToHex } from "@padloc/core/src/encoding";
import { sub } from "date-fns";

import { app } from "../globals";
import { passwordStrength } from "../lib/util";
import { ListItem } from "../elements/items-list";

type Constructor<T> = new (...args: any[]) => T;

export const AuditMixin = <T extends Constructor<LitElement>>(baseElement: T) => {
    abstract class M extends baseElement {
        async auditVaults(
            vaults: Vault[],
            {
                updateOnlyItemWithId,
                updateOnlyIfOutdated,
            }: { updateOnlyItemWithId?: string; updateOnlyIfOutdated?: boolean } = {}
        ) {
            const reusedPasswords: ListItem[] = [];
            const weakPasswords: ListItem[] = [];
            const compromisedPasswords: ListItem[] = [];

            // Don't try to run if the app has locked
            if (app.state.locked) {
                return {
                    reusedPasswords,
                    weakPasswords,
                    compromisedPasswords,
                };
            }

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

                            auditResults.push({
                                type: AuditResultType.WeakPassword,
                                fieldIndex: passwordField.fieldIndex,
                            });
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
    }

    return M;
};

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
