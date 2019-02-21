import { SharedContainer } from "./container";
import { Storable } from "./storage";
import { VaultItemCollection } from "./item";
import { Revision } from "./collection";
import { Account, AccountID } from "./account";
import { Group } from "./group";
import { OrgID } from "./org";

export type VaultID = string;
export type VaultRole = "admin" | "writer" | "reader";

export class Vault extends SharedContainer implements Storable {
    id: VaultID = "";
    org?: OrgID;
    name = "";
    owner: AccountID = "";
    created = new Date(0);
    updated = new Date(0);
    archived?: Date;
    items = new VaultItemCollection();
    revision?: Revision;

    toRaw() {
        return super.toRaw(["items"]);
    }

    validate() {
        return (
            typeof this.id === "string" &&
            typeof this.name === "string" &&
            (typeof this.org === "string" || typeof this.org === "undefined") &&
            typeof this.owner === "string" &&
            (typeof this.archived === "undefined" || this.archived instanceof Date) &&
            (typeof this.revision === "undefined" || typeof this.revision === "object")
        );
    }

    fromRaw({ id, name, owner, created, updated, archived, revision, ...rest }: any) {
        Object.assign(this, {
            id,
            name,
            owner,
            revision,
            created: new Date(created),
            updated: new Date(updated),
            archived: archived ? new Date(archived) : undefined
        });

        return super.fromRaw(rest);
    }

    async access(account: Account | Group) {
        await super.access(account);
        if (this.encryptedData) {
            this.items.fromBytes(await this.getData());
        }
    }

    async commit() {
        await this.setData(this.items.toBytes());
    }

    merge(vault: Vault) {
        this.items.merge(vault.items);
        this.revision = this.items.revision;
    }
}
