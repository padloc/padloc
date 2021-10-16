import { Message, MessageData, Messenger } from "@padloc/core/src/messenger";
import { createTransport, Transporter, TransportOptions } from "nodemailer";
import { Config, ConfigParam } from "@padloc/core/src/config";
import { readFileSync, readdirSync } from "fs";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { resolve } from "path";

export class SMTPConfig extends Config {
    constructor(init: Partial<SMTPConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam()
    host: string = "";

    @ConfigParam()
    port: string = "";

    @ConfigParam("boolean")
    secure: boolean = false;

    @ConfigParam()
    user: string = "";

    @ConfigParam("string", true)
    password: string = "";

    templateDir: string = "";

    @ConfigParam()
    from?: string;
}

export class SMTPSender implements Messenger {
    private _transporter: Transporter;

    private _templates = new Map<string, string>();

    constructor(private config: SMTPConfig) {
        let auth = null;
        if (config.user && config.password) {
            auth = {
                user: config.user,
                pass: config.password,
            };
        }
        this._transporter = createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: auth,
        } as TransportOptions);

        this._loadTemplates(this.config.templateDir);
    }

    private _loadTemplates(templateDir: string) {
        const files = readdirSync(templateDir);

        for (const fileName of files) {
            this._templates.set(fileName.replace(/\.html$/, ""), readFileSync(resolve(templateDir, fileName), "utf-8"));
        }
    }

    private _getMessageContent<T extends MessageData>(message: Message<T>) {
        let html = this._templates.get(message.template);
        if (!html) {
            throw new Err(ErrorCode.SERVER_ERROR, `Template not found: ${message.template}`);
        }

        for (const [name, value] of Object.entries(message.data)) {
            html = html.replace(new RegExp(`{{ ?${name} ?}}`, "gi"), value);
        }

        return { html };
    }

    async send<T extends MessageData>(email: string, message: Message<T>) {
        const { html } = this._getMessageContent(message);

        let opts = {
            from: this.config.from || this.config.user,
            to: email,
            subject: message.title,
            text: html,
            html,
        };

        return this._transporter.sendMail(opts);
    }
}
