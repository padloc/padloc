import { ConfigParam, Config } from "../../config";

export class PostgresConfig extends Config {
    @ConfigParam("string", { required: true, default: "localhost" }, "The hostname of the Postgres server")
    host: string = "localhost";

    @ConfigParam("string", { required: true }, "The username used for authentication.")
    user: string = "";

    @ConfigParam("string", { required: true, secret: true }, "The password used for authentication.")
    password: string = "";

    @ConfigParam("number", { required: true, default: 5432 }, "The port to connect over.")
    port: number = 5432;

    @ConfigParam("string", { required: true, default: "padloc" }, "The database to use.")
    database = "padloc";

    @ConfigParam("boolean", {}, "Set to `true` to connect over tls.")
    tls?: boolean;

    @ConfigParam("string", {}, "The path to a certificate authority file to use for the connection.")
    tlsCAFile?: string;

    @ConfigParam("string", {}, "Use this instead of `tlsCAFile` to set the certificate contents directly.")
    tlsCAFileContents?: string;

    @ConfigParam(
        "boolean",
        { default: true },
        "Whether or not to reject unauthorized connections. " +
            "If your connections are being rejected and you can't figure out why, try setting this to false."
    )
    tlsRejectUnauthorized?: boolean = true;
}
