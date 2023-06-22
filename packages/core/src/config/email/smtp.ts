import { Config, ConfigParam } from "../../config";

export class SMTPConfig extends Config {
    constructor(init: Partial<SMTPConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam("string", { required: true, default: "localhost" }, "The host of the SMTP server.")
    host: string = "localhost";

    @ConfigParam("number", { required: true, default: 1025 }, "The port where the SMTP server can be reached.")
    port: number = 1025;

    @ConfigParam("string", { required: true }, "The username to authenticate with.")
    user: string = "";

    @ConfigParam("string", { required: true, secret: true }, "The password to authenticate with.")
    password: string = "";

    @ConfigParam(
        "string",
        {},
        "An optional alternative directory to load emails from. By default, Padloc will use the emails under `assets/email`."
    )
    templateDir?: string;

    @ConfigParam()
    from?: string;

    @ConfigParam(
        "boolean",
        { default: false },
        "If `true` the connection will use TLS when connecting to server. If `false` (the default) then TLS is used only if server supports the STARTTLS extension. In most cases set this value to `true` if you are connecting to port `465`. For port `587` or `25` keep it `false`."
    )
    secure?: boolean;

    @ConfigParam(
        "boolean",
        { default: false },
        "If this is `true` and `secure` is set to `false` then TLS is not used even if the server supports STARTTLS extension."
    )
    ignoreTLS?: boolean;
}
