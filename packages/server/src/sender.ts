import { createTransport, Transporter, TransportOptions } from "nodemailer";

export interface Sender {
    send(addr: string, subj: string, msg: string): Promise<void>;
}

export interface EmailOptions {
    host: string;
    port: string;
    user: string;
    password: string;
    from?: string;
}

export class EmailSender implements Sender {
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

    send(email: string, subject: string, message: string) {
        let opts = {
            from: this.opts.from || this.opts.user,
            to: email,
            subject: subject,
            text: message
        };

        return this.transporter.sendMail(opts);
    }
}
