import { SharedContainer } from "./container";
import { Storable } from "./storage";
import { VaultItemCollection } from "./item";
import { Account, AccountID } from "./account";
import { OrgID } from "./org";

/** Unique identifier for [[Vault]] objects */
export type VaultID = string;

/**
 * Container for securely storing a collection of [[VaultItem]]s. Vaults can be owned by a single
 * user ("private" vaults) or shared between multiple users ("shared" vaults). Shared vaults are
 * provisioned and managed through [[Org]]s.
 */
export class Vault extends SharedContainer implements Storable {
    /** unique identifier */
    id: VaultID = "";

    /** The [[Org]] this vault belongs to (if a shared vault) */
    org?: { id: OrgID; name: string };

    /** Vault name */
    name = "";

    /** The vault owner (the [[Account]] that created this vault) */
    owner: AccountID = "";

    /** Time of creation */
    created = new Date(0);

    /** Time of last update */
    updated = new Date(0);

    /**
     * Revision id used for ensuring continuity when synchronizing the vault
     * object between client and server
     */
    revision: string = "";

    /**
     * A collection [[VaultItem]]s representing the senstive data store in this vault
     *
     * @secret
     *
     * **IMPORTANT**: This property is considered **secret**
     * and should never stored or transmitted in plain text
     */
    items = new VaultItemCollection();

    toRaw() {
        // The `items` property is considered secret and should therefore be
        // excluded from serialization
        return super.toRaw(["items"]);
    }

    validate() {
        return (
            super.validate() &&
            (typeof this.id === "string" &&
                typeof this.name === "string" &&
                (!this.org || (typeof this.org.id === "string" && typeof this.org.name === "string")) &&
                typeof this.owner === "string" &&
                typeof this.revision === "string")
        );
    }

    fromRaw({ id, name, owner, org, created, updated, archived, revision, ...rest }: any) {
        Object.assign(this, {
            id,
            name,
            owner,
            org,
            revision,
            created: new Date(created),
            updated: new Date(updated)
        });

        return super.fromRaw(rest);
    }

    /**
     * Unlocks the vault with the given `account`, decrypting the data stored in the vault
     * and populating the [[items]] property. For this to be successful, the `account` object
     * needs to be unlocked and the account must have access to this vault.
     */
    async unlock(account: Account) {
        await super.unlock(account);
        if (this.encryptedData) {
            this.items.fromBytes(await this.getData());
        }
    }

    async lock() {
        await super.lock();
        this.items = new VaultItemCollection();
    }

    /**
     * Commit changes to `items` by reencrypting the data.
     */
    async commit() {
        await this.setData(this.items.toBytes());
    }

    /**
     * Merges in changes from another `vault`. This requires both vaults to be unlocked.
     *
     * @returns `true` if there have been any "forward changes", i.e. if there
     * have been any changes in this vault that may need to be applied to other
     * instances. Specifically, this can be used during synchronization with a [[Server]]
     * to determine whether an update needs to be pushed back.
     */
    merge(vault: Vault): boolean {
        this.items.merge(vault.items);
        this.name = vault.name;
        this.revision = vault.revision;
        return this.items.lastMerged !== vault.items.lastMerged;
    }

    toString() {
        return this.org ? `${this.org.name} / ${this.name}` : this.name;
    }
}
