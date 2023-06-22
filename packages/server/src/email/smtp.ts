import { Message, MessageData, Messenger } from "@padloc/core/src/messenger";
import { createTransport, Transporter, TransportOptions } from "nodemailer";
import { readFileSync, readdirSync } from "fs";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { resolve } from "path";
import dompurify from "../tools/dompurify";
import { SMTPConfig } from "@padloc/core/src/config/email/smtp";

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
            ignoreTLS: config.ignoreTLS,
        } as TransportOptions);

        this._loadTemplates(this.config.templateDir || "assets/email");
    }

    private _loadTemplates(templateDir: string) {
        console.log("load templates", templateDir);
        const files = readdirSync(templateDir);

        for (const fileName of files) {
            this._templates.set(fileName, readFileSync(resolve(templateDir, fileName), "utf-8"));
        }
    }

    private _getMessageContent<T extends MessageData>(message: Message<T>) {
        let html = this._templates.get(`${message.template}.html`);
        let text = this._templates.get(`${message.template}.txt`);

        if (!html || !text) {
            throw new Err(ErrorCode.SERVER_ERROR, `Template not found: ${message.template}`);
        }

        for (const [name, value] of Object.entries({ title: message.title, ...message.data })) {
            html = html.replace(new RegExp(`{{ ?${name} ?}}`, "gi"), dompurify.sanitize(value));
            text = text.replace(new RegExp(`{{ ?${name} ?}}`, "gi"), value);
        }

        return { html, text };
    }

    async send<T extends MessageData>(email: string, message: Message<T>) {
        const { html, text } = this._getMessageContent(message);

        let opts = {
            from: this.config.from || this.config.user,
            to: email,
            subject: message.title,
            text,
            html,
        };

        return this._transporter.sendMail(opts);
    }
}
