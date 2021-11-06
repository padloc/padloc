import { MongoClient, Db, Collection, CreateCollectionOptions, ObjectId } from "mongodb";
import { Storage, Storable, StorableConstructor, StorageListOptions } from "@padloc/core/src/storage";
import { Err, ErrorCode } from "@padloc/core/src/error";
import path from "path";
import { Config, ConfigParam } from "@padloc/core/src/config";

export class MongoDBStorageConfig extends Config {
    @ConfigParam()
    host: string = "localhost";
    @ConfigParam()
    port: number = 27017;
    @ConfigParam()
    username: string = "";
    @ConfigParam("string", true)
    password: string = "";
    @ConfigParam()
    authDatabase?: string;
    @ConfigParam()
    database = "padloc";
    @ConfigParam()
    protocol?: string;
    @ConfigParam("boolean")
    tls?: boolean;
    @ConfigParam()
    tlsCAFile?: string;
    @ConfigParam("boolean")
    acknowledgeWrites: boolean = true;
    @ConfigParam("number")
    maxSize?: number;
    @ConfigParam("number")
    maxDocuments?: number;
}

export class MongoDBStorage implements Storage {
    readonly config: MongoDBStorageConfig;

    private _client: MongoClient;
    private _db!: Db;
    private _collections = new Map<string, Promise<Collection>>();

    constructor(config: MongoDBStorageConfig) {
        this.config = config;
        let { username, password, host, port, protocol = "mongodb", authDatabase, tls, tlsCAFile } = config;
        tlsCAFile = tlsCAFile && path.resolve(process.cwd(), tlsCAFile);
        this._client = new MongoClient(
            `${protocol}://${host}${authDatabase ? `/${authDatabase}` : ""}${port ? `:${port}` : ""}`,
            {
                auth: {
                    username,
                    password,
                },
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
        await this._client.connect();
        this._db = this._client.db(this.config.database);
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

    async list<T extends Storable>(_cls: StorableConstructor<T>, _options: StorageListOptions<T> = {}): Promise<T[]> {
        throw "not implemented";
    }
}
