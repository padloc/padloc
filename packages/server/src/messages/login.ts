import { base as baseHTML, paragraph as p, colorBackground } from "./base-html";
import { Message } from "../sender";
import { AuthRequest } from "../auth";

export class LoginMessage implements Message {
    constructor(private req: AuthRequest) {}

    title = "Your Login Code";

    get text() {
        const { email, code } = this.req;

        return `
Hi there!

you are receiving this email because you tried to log into KEEEP
using the email address ${email}

Here is your login code:

${code.toUpperCase()}

If you believe you may have received this email in error, please contact us at support@padlock.io

Best,
Martin`;
    }

    get html() {
        const { email, code } = this.req;
        return baseHTML(`

            ${p("Hi there!")}

            ${p(`
                you are receiving this email because you tried to log into <strong>KEEEP</strong>
                using the email address <strong>${email}</strong>
            `)}

            ${p(`Here is your login code:`)}

            ${p(
                code.toUpperCase(),
                `
background-color: ${colorBackground};\
padding: 15px;\
border-radius: 10px;\
font-size: 30px;\
font-family: monospace;\
text-align: center;\
letter-spacing: 0.2em;\
                `
            )}

            ${p(`
                If you believe you may have received this email in error, please contact us at <strong>support@padlock.io</strong>
            `)}

            ${p(`
                Best,<br/>
                Martin
            `)}
        `);
    }
}
