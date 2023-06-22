import { Config, ConfigParam } from "../../config";

export class MongoDBStorageConfig extends Config {
    @ConfigParam("string", { required: true, default: "localhost" }, "The host of the database server.")
    host: string = "localhost";

    @ConfigParam("number", { required: true, default: 27017 }, "The port of the database server.")
    port: number = 27017;

    @ConfigParam("string", { required: true }, "The username to authenticate with.")
    username: string = "";

    @ConfigParam("string", { required: true, secret: true }, "The password to authenticate with.")
    password: string = "";

    @ConfigParam("string", {}, "The database to authenticate with.")
    authDatabase?: string;

    @ConfigParam("string", { required: true, default: "padloc" }, "The database to store the data in.")
    database = "padloc";

    @ConfigParam("string", {}, "The protocol to connect over.")
    protocol?: string;

    @ConfigParam("boolean", {}, "Set `true` to connect over tls")
    tls?: boolean;

    @ConfigParam("boolean", {}, "The path to a certificate authority file to use for the connection.")
    tlsCAFile?: string;

    @ConfigParam(
        "boolean",
        { required: true, default: true },
        "Whether or not to acknoledge writes. See https://www.mongodb.com/docs/manual/reference/write-concern/#acknowledgment-behavior"
    )
    acknowledgeWrites: boolean = true;

    @ConfigParam("number", {}, "The maximum size the database is allowed to reach.")
    maxSize?: number;

    @ConfigParam("number", {}, "The maximum number of documents the database is allowed to reach.")
    maxDocuments?: number;
}
