import { Invite } from "../invite";
import { Message } from "../messenger";
import { base as baseHTML, paragraph as p, button } from "./base-html";

export class InviteCreatedMessage implements Message {
    constructor(private invite: Invite, private link: string) {}

    get title() {
        const { vault, invitor } = this.invite;
        return `${invitor!.name || invitor!.email} wants you to join the "${vault!.name}" vault on Padlock!`;
    }

    get text() {
        const { vault, invitor } = this.invite;
        return `
Hi there!

You have been invited by ${invitor!.name || invitor!.email} to join his vault "${vault!.name}" on Padlock! To accept the invite,
please visit the link below:

${this.link}

If you believe you may have received this email in error, please contact us at support@padlock.io

Best,
Martin`;
    }

    get html() {
        const { vault, invitor } = this.invite;
        return baseHTML(`

            ${p("Hi there!")}

            ${p(`
                You have been invited by <strong>${invitor!.name || invitor!.email}</strong> to join his vault <strong>${vault!.name}</strong> on Padlock!
            `)}

            ${button(`Join ${vault!.name}`, this.link)}

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
