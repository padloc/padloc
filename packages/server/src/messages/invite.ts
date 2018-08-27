import { base as baseHTML, paragraph as p, button } from "./base-html";
import { Message } from "../sender";

export class InviteMessage implements Message {
    constructor(private invite: { name: string; kind: string; url: string; sender: string }) {}

    get title() {
        const { name, kind, sender } = this.invite;
        return `${sender} wants you to join the "${name}" ${kind} on Padlock!`;
    }

    get text() {
        const { name, kind, url, sender } = this.invite;

        return `
Hi there!

You have been invited by ${sender} to join the "${name}" ${kind} on Padlock! To accept or reject the invite,
please visit the link below:

${url}

If you believe you may have received this email in error, please contact us at support@padlock.io

Best,
Martin`;
    }

    get html() {
        const { name, kind, url, sender } = this.invite;
        return baseHTML(`

            ${p("Hi there!")}

            ${p(`
                You have been invited by <strong>${sender}</strong> to join the <strong>${name}</strong>
                ${kind} on Padlock!
            `)}

            ${button("View Invite", url)}

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
