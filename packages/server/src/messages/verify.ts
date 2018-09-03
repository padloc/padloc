import { base as baseHTML, paragraph as p, colorBackground } from "./base-html";
import { Message } from "../sender";
import { EmailVerification } from "../api";

export class EmailVerificationMessage implements Message {
    constructor(public verification: EmailVerification) {}

    title = "Verify Your Email Address";

    get text() {
        const { code } = this.verification;

        return `
Hi there!

Your email verifiation code is:

${code.toUpperCase()}

If you believe you may have received this email in error, please contact us at support@padlock.io

Best,
The Padlock Team`;
    }

    get html() {
        const { code } = this.verification;
        return baseHTML(`

            ${p("Hi there!")}

            ${p(`Your email verifiation code is:`)}

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
