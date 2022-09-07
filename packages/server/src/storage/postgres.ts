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

    @ConfigParam("boolean")
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

    private _toJsonbPath(path: string) {
        const pathParts = path.split(".");
        return (
            "data" +
            pathParts
                .slice(0, -1)
                .map((part) => `->'${part}'`)
                .join("") +
            `->>'${pathParts[pathParts.length - 1]}'`
        );
    }

    async list<T extends Storable>(
        cls: StorableConstructor<T>,
        { limit, offset, where, orderBy, orderByDirection = "asc" }: StorageListOptions = {}
    ): Promise<T[]> {
        const kind = new cls().kind;
        await this._ensureTable(kind);

        let query = `SELECT data FROM ${kind}`;

        if (where) {
            where = Array.isArray(where) ? where : [where];
            const orConditions: string[][][] = [];

            for (const orWhere of where) {
                const andConditions: string[][] = [];

                for (const [path, val] of Object.entries(orWhere)) {
                    const jsonbPath = this._toJsonbPath(path);

                    const values = Array.isArray(val) ? val : [val];

                    andConditions.push(
                        values.map((val) => {
                            switch (typeof val) {
                                case "string":
                                    return `${jsonbPath} LIKE '${val.replace(/\*/g, "%")}'`;
                                case "boolean":
                                    return `${jsonbPath} = ${val.toString()}`;
                                case "undefined":
                                    return `${jsonbPath} IS NULL`;
                                default:
                                    return val === null ? `${jsonbPath} IS NULL` : `${jsonbPath} = ${val.toString()}`;
                            }
                        })
                    );
                }

                orConditions.push(andConditions);
            }

            if (orConditions.length) {
                query += ` WHERE ${orConditions
                    .map(
                        (andConditions) =>
                            `(${andConditions.map((orConditions) => orConditions.join(" OR ")).join(" AND ")})`
                    )
                    .join(" OR ")}`;
            }
        }

        if (orderBy) {
            query += ` ORDER BY ${this._toJsonbPath(orderBy)} ${orderByDirection}`;
        }

        if (offset) {
            query += ` OFFSET ${offset}`;
        }

        if (limit) {
            query += ` LIMIT ${limit}`;
        }

        const { rows } = await this._pool.query(query);
        return rows.map((row) => new cls().fromRaw(row.data));
    }
}
