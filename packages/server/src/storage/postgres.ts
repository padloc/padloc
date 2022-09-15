import { Pool } from "pg";
import { Storable, StorableConstructor, Storage, StorageListOptions, StorageQuery } from "@padloc/core/src/storage";
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

function toJsonbPath(path: string) {
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

function queryToSQL(query: StorageQuery): string {
    switch (query.op) {
        case "and":
            return `(${query.queries.map((q) => queryToSQL(q)).join(" AND ")})`;
        case "or":
            return `(${query.queries.map((q) => queryToSQL(q)).join(" OR ")})`;
        case "not":
            return `NOT (${queryToSQL(query.query)})`;
        default:
            const op = { eq: "=", ne: "!=", gt: ">", lt: "<", gte: ">=", lte: "<=", regex: "~*", negex: "!~*" }[
                query.op || "eq"
            ];
            switch (typeof query.value) {
                case "string":
                case "boolean":
                case "number":
                    return `${toJsonbPath(query.path)} ${op} '${query.value.toString()}'`;
                default:
                    return `${toJsonbPath(query.path)} IS NULL`;
            }
    }
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

    async list<T extends Storable>(
        cls: StorableConstructor<T>,
        { limit, offset, query: where, orderBy, orderByDirection = "asc" }: StorageListOptions = {}
    ): Promise<T[]> {
        const kind = new cls().kind;
        await this._ensureTable(kind);

        let query = `SELECT data FROM ${kind}`;

        if (where) {
            query += ` WHERE ${queryToSQL(where)}`;
        }

        if (orderBy) {
            query += ` ORDER BY ${toJsonbPath(orderBy)} ${orderByDirection}`;
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
