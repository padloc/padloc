import { Message, Messenger } from "@padloc/core/src/messenger";
import { createTransport, Transporter, TransportOptions } from "nodemailer";
import { Config, ConfigParam } from "@padloc/core/src/config";

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

    @ConfigParam()
    from?: string;
}

export class SMTPSender implements Messenger {
    private transporter: Transporter;

    constructor(private opts: SMTPConfig) {
        let auth = null;
        if (opts.user && opts.password) {
            auth = {
                user: opts.user,
                pass: opts.password,
            };
        }
        this.transporter = createTransport({
            host: opts.host,
            port: opts.port,
            secure: opts.secure,
            auth: auth,
        } as TransportOptions);
    }

    send(email: string, message: Message) {
        let opts = {
            from: this.opts.from || this.opts.user,
            to: email,
            subject: message.title,
            text: message.text,
            html: message.html,
        };

        return this.transporter.sendMail(opts);
    }
}
