import { HashParams } from "@padloc/core/src/crypto";
import { bytesToHex, stringToBytes } from "@padloc/core/src/encoding";
import { AuditResult, AuditResultType, FieldType } from "@padloc/core/src/item";
import { getCryptoProvider } from "@padloc/core/src/platform";
import { Vault } from "@padloc/core/src/vault";
import { $l } from "@padloc/locale/src/translate";
import { sub } from "date-fns";
import { ListItem } from "../elements/items-list";
import { app } from "../globals";
import { passwordStrength } from "./util";

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
    vaults: Vault[] = app.vaults,
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

    const usedPasswordHashCounts = new Map<string, number>();
    const reusedPasswordItemIds: Set<string> = new Set();
    const weakPasswordItemIds: Set<string> = new Set();
    const compromisedPasswordItemIds: Set<string> = new Set();

    // We need to do a run once for all the password hashes, to calculate reused afterwards, otherwise order can become a problem
    for (const vault of vaults) {
        for (const item of vault.items) {
            const passwordFields = item.fields
                .map((field, fieldIndex) => ({ field, fieldIndex }))
                .filter((field) => field.field.type === FieldType.Password)
                .filter((field) => Boolean(field.field.value));

            for (const passwordField of passwordFields) {
                const passwordHash = await sha1(passwordField.field.value);

                const currentPasswordHashCount = usedPasswordHashCounts.get(passwordHash) || 0;

                usedPasswordHashCounts.set(passwordHash, currentPasswordHashCount + 1);
            }
        }
    }

    const oneWeekAgo = sub(new Date(), { weeks: 1 });

    let resultsFound = false;

    for (const vault of vaults) {
        let vaultResultsFound = false;

        for (const item of vault.items) {
            if (updateOnlyItemWithId) {
                if (item.id !== updateOnlyItemWithId) {
                    continue;
                }
            }

            if (updateOnlyIfOutdated && item.lastAudited && item.lastAudited >= oneWeekAgo) {
                continue;
            }

            const passwordFields = item.fields
                .map((field, fieldIndex) => ({ field, fieldIndex }))
                .filter((field) => field.field.type === FieldType.Password)
                .filter((field) => Boolean(field.field.value));

            // If an item had password fields that failed audits and were since removed, we need to run the audit again to clear and update it
            const itemHasFailedAudits = (item.auditResults || []).length > 0;

            if (passwordFields.length === 0 && !itemHasFailedAudits) {
                continue;
            }

            const auditResults: AuditResult[] = [];

            for (const passwordField of passwordFields) {
                const passwordHash = await sha1(passwordField.field.value);

                // Perform reused audit (can't skip as it's interdependent)
                if (usedPasswordHashCounts.get(passwordHash)! > 1) {
                    // Don't add the same item twice to the list, if there are more than one reused password fields in it
                    if (!reusedPasswordItemIds.has(item.id)) {
                        reusedPasswords.push({ item, vault });
                        reusedPasswordItemIds.add(item.id);
                    }

                    if (app.settings.securityCheckReused) {
                        auditResults.push({
                            type: AuditResultType.ReusedPassword,
                            fieldIndex: passwordField.fieldIndex,
                        });
                    }

                    vaultResultsFound = true;
                }

                if (app.settings.securityCheckWeak) {
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

                        vaultResultsFound = true;
                    }
                }

                if (app.settings.securityCheckCompromised) {
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

                        vaultResultsFound = true;
                    }
                }
            }

            item.auditResults = auditResults;
            item.lastAudited = new Date();
            vault.items.update(item);
        }

        if (!vaultResultsFound) {
            await app.saveVault(vault);
        }

        resultsFound = resultsFound || vaultResultsFound;
    }

    if (resultsFound) {
        await app.save();
    }

    return {
        reusedPasswords,
        weakPasswords,
        compromisedPasswords,
    };
}

export function noItemsTextForAudit(type: AuditResultType) {
    switch (type) {
        case AuditResultType.WeakPassword:
            return $l("You don't have any items with weak passwords!");
        case AuditResultType.ReusedPassword:
            return $l("You don't have any items with reused passwords!");
        case AuditResultType.CompromisedPassword:
            return $l("You don't have any items with compromised passwords!");
        default:
            return $l("You don't have any insecure items!");
    }
}

export function titleTextForAudit(type: AuditResultType) {
    switch (type) {
        case AuditResultType.WeakPassword:
            return $l("Weak Passwords");
        case AuditResultType.ReusedPassword:
            return $l("Reused Passwords");
        case AuditResultType.CompromisedPassword:
            return $l("Compromised Passwords");
        default:
            return $l("Insecure");
    }
}

export function iconForAudit(type: AuditResultType) {
    switch (type) {
        case AuditResultType.WeakPassword:
            return "weak";
        case AuditResultType.ReusedPassword:
            return "reused";
        case AuditResultType.CompromisedPassword:
            return "compromised";
        default:
            return "audit-fail";
    }
}

export function descriptionForAudit(type: AuditResultType) {
    switch (type) {
        case AuditResultType.WeakPassword:
            return $l(
                "Passwords are considered weak if they're too short, don't have a lot of variation or contain commonly used words or phrases. These passwords generally don't offer enough protection against automated guessing attempts and should be replaced with strong, randomly generated passwords."
            );
        case AuditResultType.ReusedPassword:
            return $l(
                "Using the same password in multiple places is strongly discouraged as a data leak in one of those places will automatically compromise all other accounts/logins using the same password. We recommend generating strong, random and unique passwords for every single vault item."
            );
        case AuditResultType.CompromisedPassword:
            return $l(
                "Compromised passwords are those that have been identified as having been leaked in the past by comparing them against a database of known data breaches. These passwords can no longer be considered secure and should be changed immediately."
            );
        default:
            "";
    }
}
