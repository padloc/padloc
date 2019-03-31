import { SharedContainer } from "./container";
import { Storable } from "./storage";
import { VaultItemCollection } from "./item";
import { Account, AccountID } from "./account";
import { OrgID } from "./org";

export type VaultID = string;
export type VaultRole = "admin" | "writer" | "reader";

export class Vault extends SharedContainer implements Storable {
    id: VaultID = "";
    org?: { id: OrgID; name: string };
    name = "";
    owner: AccountID = "";
    created = new Date(0);
    updated = new Date(0);
    items = new VaultItemCollection();
    revision: string = "";

    toRaw() {
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

    async unlock(account: Account) {
        await super.unlock(account);
        if (this.encryptedData) {
            this.items.fromBytes(await this.getData());
        }
    }

    async commit() {
        await this.setData(this.items.toBytes());
    }

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
