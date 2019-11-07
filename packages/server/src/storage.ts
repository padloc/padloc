// @ts-ignore
import level from "level";
import { Storage, Storable, StorableConstructor } from "@padloc/core/src/storage";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { AwsRegion } from "aws-sdk/clients/servicequotas";
import DynamoDB from "aws-sdk/clients/dynamodb";
import { CredentialProviderChain } from "aws-sdk";

export class LevelDBStorage implements Storage {
    private _db: any;

    constructor(public path: string) {
        this._db = level(`${this.path}`);
    }

    async get<T extends Storable>(cls: StorableConstructor<T> | T, id: string) {
        try {
            const res = cls instanceof Storable ? cls : new cls();
            const raw = await this._db.get(`${res.kind}_${id}`);
            return res.fromJSON(raw);
        } catch (e) {
            if (e.notFound) {
                throw new Err(ErrorCode.NOT_FOUND);
            } else {
                throw e;
            }
        }
    }

    async save<T extends Storable>(obj: T) {
        await this._db.put(`${obj.kind}_${obj.id}`, obj.toJSON());
    }

    async delete<T extends Storable>(obj: T) {
        await this._db.del(`${obj.kind}_${obj.id}`);
    }

    async clear() {
        throw "not implemented";
    }
}

// Add support for AWS DynamoDB
// Limitations with DynamoDB is that Total Item Size is only 400KB
// This means that a Vault can not exceed 400KB In size with the current
// Storage Implimentation as is. That's about 500 Standard Items
export class DynamoDBStorage implements Storage {
    private _db: any;
    private table: string;

    constructor(public credentials: CredentialProviderChain, region: AwsRegion, table: string) {
        this._db = new DynamoDB({ credentialProvider: credentials, region: region });
        this.table = table;
    }

    async get<T extends Storable>(cls: StorableConstructor<T> | T, id: string) {
        try {
            const res = cls instanceof Storable ? cls : new cls();
            const raw = await this._db
                .getItem({
                    Key: {
                        storeable: {
                            S: `${res.kind}_${id}`
                        }
                    },
                    TableName: this.table
                })
                .promise();

            // DynamoDB does not return an error on empty result.
            // Checking whether the _item_ property is defined to
            // determine whether the Item is not found.

            if (typeof raw.Item === "undefined") {
                throw new Err(ErrorCode.NOT_FOUND);
            } else {
                return res.fromJSON(raw.Item.secret.S);
            }
        } catch (e) {
            throw e;
        }
    }

    async save<T extends Storable>(obj: T) {
        await this._db
            .putItem({
                Item: {
                    storeable: {
                        S: `${obj.kind}_${obj.id}`
                    },
                    secret: {
                        S: obj.toJSON()
                    }
                },
                TableName: this.table
            })
            .promise();
    }

    async delete<T extends Storable>(obj: T) {
        await this._db
            .deleteItem({
                Key: {
                    storeable: {
                        S: `${obj.kind}_${obj.id}`
                    }
                },
                TableName: this.table
            })
            .promise();
    }

    async clear() {
        throw "not implemented";
    }
}
