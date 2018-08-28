import { Group } from "./group";
import { Collection } from "./data";
import { Storable } from "./storage";
import { SharedContainer } from "./crypto";
import { Account } from "./auth";

export class Store extends Group implements Storable {
    kind = "store";
    name: string = "";
    collection = new Collection();

    get pk() {
        return this.id;
    }

    private _collectionContainer = new SharedContainer();

    access(account: Account) {
        super.access(account);
        this._collectionContainer.access(account);
    }

    async serialize(): Promise<any> {
        const raw = await super.serialize();
        const member = this._account && this.getMember(this._account);

        if (member && member.permissions.write) {
            // TODO: Do something about removed members
            await this._collectionContainer.setAccessors(
                this.members.filter(m => m.status === "active").map(({ id, publicKey }) => {
                    return { id, publicKey, encryptedKey: "" };
                })
            );
            await this._collectionContainer.set(this.collection);
        }

        raw.collectionData = await this._collectionContainer.serialize();

        return raw;
    }

    async deserialize(raw: any) {
        await super.deserialize(raw);
        await this._collectionContainer.deserialize(raw.collectionData);
        const member = this._account && this.getMember(this._account);

        if (member && member.permissions.read) {
            await this._collectionContainer.get(this.collection);
        }

        return this;
    }
}
