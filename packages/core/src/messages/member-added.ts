import { Org } from "../org";
import { Message } from "../messenger";
import { base as baseHTML, paragraph as p, button } from "./base-html";

export class MemberAddedMessage implements Message {
    constructor(public org: Org, public link: string) {}

    get title() {
        return `You have successfully joined ${this.org.name} on Padloc!`;
    }

    get text() {
        const { name } = this.org;

        return `
Hi there!

You now have access to ${name} on Padloc! You can view it using the following link:

${this.link}

Have a great day`;
    }

    get html() {
        const { name } = this.org;
        return baseHTML(
            `

            ${p("Hi there!")}

            ${p(`
                You now have access to <strong>${name}</strong> on Padloc!
            `)}

            ${button(`View ${name}`, this.link)}

            ${p(`Have a great day!`)}
        `,
            this.title,
            this.title
        );
    }
}
