import { MongoClient, Db, Collection, CreateCollectionOptions, ObjectId, Filter, FindOptions } from "mongodb";
import { Storage, Storable, StorableConstructor, StorageListOptions, StorageQuery } from "@padloc/core/src/storage";
import { Err, ErrorCode } from "@padloc/core/src/error";
import path from "path";
import { MongoDBStorageConfig } from "@padloc/core/src/config/storage/mongodb";

function queryToMongoFilter(query: StorageQuery): Filter<any> {
    switch (query.op) {
        case "and":
            return { $and: query.queries.map((q) => queryToMongoFilter(q)) };
        case "or":
            return { $or: query.queries.map((q) => queryToMongoFilter(q)) };
        case "not":
            return { $nor: [queryToMongoFilter(query.query)] };
        case "regex":
            return {
                [query.path]: {
                    $regex: query.value,
                    $options: "i",
                },
            };
        case "negex":
            return {
                [query.path]: {
                    $not: {
                        $regex: query.value,
                        $options: "i",
                    },
                },
            };
        case "eq":
        case undefined:
            return {
                [query.path]: query.value,
            };
        default:
            return {
                [query.path]: {
                    [`$${query.op}`]: query.value,
                },
            };
    }
}

export class MongoDBStorage implements Storage {
    readonly config: MongoDBStorageConfig;

    private _client: MongoClient;
    private _db!: Db;
    private _collections = new Map<string, Promise<Collection>>();
    private _initPromise?: Promise<void>;
    private _disposePromise?: Promise<void>;

    constructor(config: MongoDBStorageConfig) {
        this.config = config;
        let { username, password, host, port, protocol = "mongodb", authDatabase, tls, tlsCAFile } = config;
        tlsCAFile = tlsCAFile && path.resolve(process.cwd(), tlsCAFile);
        console.log(
            `${protocol}://${host}${authDatabase ? `/${authDatabase}` : ""}${port ? `:${port}` : ""}`,
            username,
            password,
            tls,
            tlsCAFile
        );
        this._client = new MongoClient(
            `${protocol}://${host}${authDatabase ? `/${authDatabase}` : ""}${port ? `:${port}` : ""}`,
            {
                auth: username
                    ? {
                          username,
                          password,
                      }
                    : undefined,
                tls,
                tlsCAFile,
            }
        );
    }

    private async _getCollection(kind: string) {
        if (!this._collections.has(kind)) {
            this._collections.set(
                kind,
                new Promise(async (resolve, reject) => {
                    try {
                        const exists = await this._db.listCollections({ name: kind }).hasNext();

                        if (!exists) {
                            const opts: CreateCollectionOptions = {
                                writeConcern: { w: this.config.acknowledgeWrites ? 1 : -1 },
                            };
                            if (this.config.maxSize) {
                                opts.capped = true;
                                opts.size = this.config.maxSize;
                                opts.max = this.config.maxDocuments;
                            }
                            await this._db.createCollection(kind, opts);
                        }
                        resolve(this._db.collection(kind));
                    } catch (e) {
                        reject(e);
                    }
                })
            );
        }

        return this._collections.get(kind)!;
    }

    async init() {
        if (!this._initPromise) {
            this._initPromise = this._client
                .connect()
                .then(() => (this._db = this._client.db(this.config.database)))
                .then(() => {});
        }

        return this._initPromise;
    }

    async dispose() {
        if (!this._disposePromise) {
            this._disposePromise = this._client.close();
        }
        return this._disposePromise;
    }

    async get<T extends Storable>(
        cls: StorableConstructor<T> | T,
        id: string,
        { useObjectId = false }: { useObjectId?: boolean } = {}
    ) {
        const res = cls instanceof Storable ? cls : new cls();
        const collection = await this._getCollection(res.kind);
        const raw = await collection.findOne({ _id: useObjectId ? new ObjectId(id) : id });
        if (!raw) {
            throw new Err(ErrorCode.NOT_FOUND, `Cannot find object: ${res.kind}_${id}`);
        }
        return res.fromRaw(raw);
    }

    async save<T extends Storable>(
        obj: T,
        {
            useObjectId = false,
            acknowledge = this.config.acknowledgeWrites,
        }: { useObjectId?: boolean; acknowledge?: boolean } = {}
    ) {
        const collection = await this._getCollection(obj.kind);
        const _id = useObjectId ? new ObjectId(obj.id) : obj.id;
        await collection.replaceOne(
            { _id },
            { ...obj.toRaw(), _id },
            { upsert: true, writeConcern: { w: acknowledge ? 1 : 0 } }
        );
    }

    async delete<T extends Storable>(obj: T, { useObjectId = false }: { useObjectId?: boolean } = {}) {
        const collection = await this._getCollection(obj.kind);
        await collection.deleteOne({ _id: useObjectId ? new ObjectId(obj.id) : obj.id });
    }

    async clear() {
        throw "not implemented";
    }

    async list<T extends Storable>(
        cls: StorableConstructor<T>,
        { offset, limit, query, orderBy, orderByDirection }: StorageListOptions = {}
    ): Promise<T[]> {
        const kind = new cls().kind;

        const collection = await this._getCollection(kind);
        const filter = query ? queryToMongoFilter(query) : {};
        const options = {
            limit,
            skip: offset,
        } as FindOptions;

        if (orderBy) {
            options.sort = {
                [orderBy]: orderByDirection === "desc" ? -1 : 1,
            };
        }

        console.log(JSON.stringify(filter, null, 4), options);

        const rows = await collection.find(filter, options).toArray();

        return rows.map((row) => new cls().fromRaw(row));
    }

    async count<T extends Storable>(cls: StorableConstructor<T>, query?: StorageQuery) {
        const kind = new cls().kind;
        const collection = await this._getCollection(kind);
        const filter = query ? queryToMongoFilter(query) : {};
        return collection.countDocuments(filter);
    }
}
