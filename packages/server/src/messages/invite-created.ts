import { Invite } from "@padlock/core/src/invite";
import { base as baseHTML, paragraph as p, button } from "./base-html";
import { Message } from "../sender";

export class InviteCreatedMessage implements Message {
    constructor(private invite: Invite) {}

    get title() {
        const { group, invitor } = this.invite;
        return `${invitor!.name || invitor!.email} wants you to join the "${group!.name}" ${group!.kind} on Padlock!`;
    }

    get text() {
        const { group, invitor } = this.invite;
        const url = `https://127.0.0.1:8081/store/${group!.id}`;

        return `
Hi there!

You have been invited by ${invitor!.name || invitor!.email} to join the "${group!.name}" ${group!.kind} on Padlock! To accept the invite,
please visit the link below:

${url}

If you believe you may have received this email in error, please contact us at support@padlock.io

Best,
Martin`;
    }

    get html() {
        const { group, invitor } = this.invite;
        const url = `https://127.0.0.1:8081/store/${group!.id}`;
        return baseHTML(`

            ${p("Hi there!")}

            ${p(`
                You have been invited by <strong>${invitor!.name || invitor!.email}</strong> to join the <strong>${group!.name}</strong>
                ${group!.kind} on Padlock!
            `)}

            ${button(`Join ${group!.name}`, url)}

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
