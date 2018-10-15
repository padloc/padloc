import { Invite } from "../invite";
import { Message } from "../messenger";
import { base as baseHTML, paragraph as p, button } from "./base-html";

export class InviteCreatedMessage implements Message {
    constructor(private invite: Invite) {}

    get title() {
        const { vault, invitor } = this.invite;
        return `${invitor!.name || invitor!.email} wants you to join ${vault!.name} on Padlock!`;
    }

    get text() {
        const { vault, invitor } = this.invite;
        const url = `https://127.0.0.1:8081/store/${vault!.id}`;

        return `
Hi there!

You have been invited by ${invitor!.name || invitor!.email} to join ${vault!.name} on Padlock! To accept the invite,
please visit the link below:

${url}

If you believe you may have received this email in error, please contact us at support@padlock.io

Best,
Martin`;
    }

    get html() {
        const { vault, invitor } = this.invite;
        const url = `https://127.0.0.1:8081/store/${vault!.id}`;
        return baseHTML(`

            ${p("Hi there!")}

            ${p(`
                You have been invited by <strong>${invitor!.name || invitor!.email}</strong> to join <strong>${vault!.name}</strong> on Padlock!
            `)}

            ${button(`Join ${vault!.name}`, url)}

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
