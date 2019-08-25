import { Message, Messenger } from "@padloc/core/src/messenger";
import { createTransport, Transporter, TransportOptions } from "nodemailer";

export interface EmailOptions {
    host: string;
    port: string;
    user: string;
    password: string;
    from?: string;
}

export class EmailMessenger implements Messenger {
    private transporter: Transporter;

    constructor(private opts: EmailOptions) {
        this.transporter = createTransport({
            host: opts.host,
            port: opts.port,
            secure: false,
            auth: {
                user: opts.user,
                pass: opts.password
            }
        } as TransportOptions);
    }

    send(email: string, message: Message) {
        let opts = {
            from: this.opts.from || this.opts.user,
            to: email,
            subject: message.title,
            text: message.text,
            html: message.html
        };

        return this.transporter.sendMail(opts);
    }
}
