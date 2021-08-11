import { MongoClient, Db } from "mongodb";
import { Storage, Storable, StorableConstructor, StorageListOptions } from "@padloc/core/src/storage";
import { Err, ErrorCode } from "@padloc/core/src/error";

export class MongoDBStorage implements Storage {
    private _client: MongoClient;
    private _db!: Db;

    constructor() {
        this._client = new MongoClient("mongodb://localhost:27017");
    }

    async init() {
        await this._client.connect();
        this._db = this._client.db("padloc_data");
    }

    async get<T extends Storable>(cls: StorableConstructor<T> | T, id: string) {
        const res = cls instanceof Storable ? cls : new cls();
        const collection = this._db.collection(res.kind);
        const raw = await collection.findOne({ _id: id });
        if (!raw) {
            throw new Err(ErrorCode.NOT_FOUND, `Cannot find object: ${res.kind}_${id}`);
        }
        return res.fromRaw(raw);
    }

    async save<T extends Storable>(obj: T) {
        const collection = this._db.collection(obj.kind);
        console.log("saving data to collection: ", collection);
        await collection.replaceOne({ _id: obj.id }, { ...obj.toRaw(), _id: obj.id }, { upsert: true });
        console.log("done saving", await collection.find().toArray());
    }

    async delete<T extends Storable>(obj: T) {
        const collection = this._db.collection(obj.kind);
        await collection.deleteOne({ _id: obj.id });
    }

    async clear() {
        throw "not implemented";
    }

    async list<T extends Storable>(_cls: StorableConstructor<T>, _options: StorageListOptions<T> = {}): Promise<T[]> {
        throw "not implemented";
    }
}
