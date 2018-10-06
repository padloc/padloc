import { Group } from "../group";
import { Message } from "../messenger";
import { base as baseHTML, paragraph as p, button } from "./base-html";

export class MemberAddedMessage implements Message {
    constructor(private group: Group) {}

    get title() {
        return `You've been added to the "${this.group.name}" ${this.group.kind} on Padlock!`;
    }

    get text() {
        const { name, kind, id } = this.group;
        const url = `https://127.0.0.1:8081/store/${id}`;

        return `
Hi there!

You know have access to the "${name}" ${kind} on Padlock! You can view the ${kind} using the following link:

${url}

If you believe you may have received this email in error, please contact us at support@padlock.io

Best,
Martin`;
    }

    get html() {
        const { name, kind, id } = this.group;
        const url = `https://127.0.0.1:8081/store/${id}`;
        return baseHTML(`

            ${p("Hi there!")}

            ${p(`
                You know have access to the <strong>${name}</strong> ${kind} on Padlock! You can view the ${kind} using the following link:
            `)}

            ${button(`View ${name}`, url)}

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
