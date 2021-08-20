import { Message, Messenger } from "@padloc/core/src/messenger";
import { createTransport, Transporter, TransportOptions } from "nodemailer";

export interface SMTPConfig {
    host: string;
    port: string;
    secure: boolean;
    user: string;
    password: string;
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
