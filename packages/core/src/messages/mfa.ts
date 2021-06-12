import { Message } from "../messenger";
import { base as baseHTML, paragraph as p, colorBackground } from "./base-html";

export class MFAMessage implements Message {
    constructor(public code: string) {}

    title = "Verify Your Email Address";

    get text() {
        return `
Hi there!

Your email verifiation code is:

${this.code.toUpperCase()}

If you believe you may have received this email in error, please contact us at support@padloc.app

Best,
The Padloc Team`;
    }

    get html() {
        return baseHTML(`

            ${p("Hi there!")}

            ${p(`Your email verifiation code is:`)}

            ${p(
                this.code.toUpperCase(),
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
                If you believe you may have received this email in error, please contact us at <strong>support@padloc.app</strong>
            `)}

            ${p(`
                Best,<br/>
                The Padloc Team
            `)}
        `);
    }
}
