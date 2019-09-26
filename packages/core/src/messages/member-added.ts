import { Org } from "../org";
import { Message } from "../messenger";
import { base as baseHTML, paragraph as p, button } from "./base-html";

export class MemberAddedMessage implements Message {
    constructor(public org: Org, public link: string) {}

    get title() {
        return `You have sucessfully join ${ this.org.name } on Padloc!`;
    }

    get text() {
        const { name } = this.org;

        return `
Hi there!

You now have access to ${name} on Padloc! You can view it using the following link:

${this.link}

If you believe you may have received this email in error, please contact us at support@padloc.app

Best,
The Padloc Team`;
    }

    get html() {
        const { name } = this.org;
        return baseHTML(`

            ${p("Hi there!")}

            ${p(`
                You now have access to <strong>${name}</strong> on Padloc!
            `)}

            ${button(`View ${name}`, this.link)}

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
