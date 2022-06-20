import { Pool } from "pg";
import { Storable, StorableConstructor, Storage, StorageListOptions } from "@padloc/core/src/storage";
import { ConfigParam } from "@padloc/core/src/config";
import { Config } from "@padloc/core/src/config";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { readFileSync } from "fs";
import { resolve } from "path";

export class PostgresConfig extends Config {
    @ConfigParam()
    host: string = "localhost";

    @ConfigParam()
    user!: string;

    @ConfigParam("string", true)
    password!: string;

    @ConfigParam("number")
    port: number = 5432;

    @ConfigParam()
    database = "padloc";

    @ConfigParam("boolean")
    tls?: boolean;

    @ConfigParam()
    tlsCAFile?: string;

    @ConfigParam()
    tlsRejectUnauthorized?: boolean = true;
}

export class PostgresStorage implements Storage {
    private _pool: Pool;

    private _ensuredTables = new Map<string, Promise<void>>();

    constructor(public config: PostgresConfig) {
        const { host, user, password, port, database, tls, tlsCAFile, tlsRejectUnauthorized } = config;
        const tlsCAFilePath = tlsCAFile && resolve(process.cwd(), tlsCAFile);
        const ca = tlsCAFilePath && readFileSync(tlsCAFilePath).toString();
        this._pool = new Pool({
            host,
            user,
            password,
            port,
            database,
            ssl: tls
                ? {
                      rejectUnauthorized: tlsRejectUnauthorized,
                      ca,
                  }
                : undefined,
        });
    }

    private _ensureTable(kind: string) {
        if (!this._ensuredTables.has(kind)) {
            this._ensuredTables.set(
                kind,
                this._pool
                    .query(
                        `
                            CREATE TABLE IF NOT EXISTS ${kind} (
                                id text PRIMARY KEY,
                                data jsonb NOT NULL
                            )
                        `
                    )
                    .then(() => {})
            );
        }
        return this._ensuredTables.get(kind);
    }

    async save<T extends Storable>(obj: T): Promise<void> {
        await this._ensureTable(obj.kind);
        await this._pool.query(
            `
            INSERT INTO ${obj.kind} (id, data) values($1, $2) ON CONFLICT (id) DO
                UPDATE SET data=$2
        `,
            [obj.id, obj.toRaw()]
        );
    }

    async get<T extends Storable>(cls: T | StorableConstructor<T>, id: string): Promise<T> {
        const res = cls instanceof Storable ? cls : new cls();
        await this._ensureTable(res.kind);
        const {
            rows: [row],
        } = await this._pool.query(`SELECT data FROM ${res.kind} WHERE id=$1`, [id]);
        if (!row) {
            throw new Err(ErrorCode.NOT_FOUND, `Cannot find object: ${res.kind}_${id}`);
        }
        return res.fromRaw(row.data);
    }

    async delete<T extends Storable>(obj: T): Promise<void> {
        await this._ensureTable(obj.kind);
        await this._pool.query(`DELETE FROM ${obj.kind} WHERE id=$1`, [obj.id]);
    }

    clear(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    list<T extends Storable>(_cls: StorableConstructor<T>, _opts?: StorageListOptions<T>): Promise<T[]> {
        throw new Error("Method not implemented.");
    }
}
