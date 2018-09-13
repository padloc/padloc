import { Invite } from "@padlock/core/src/invite";
import { base as baseHTML, paragraph as p, button } from "./base-html";
import { Message } from "../sender";

export class InviteAcceptedMessage implements Message {
    constructor(private invite: Invite) {}

    get title() {
        return `${this.invite.invitee!.name || this.invite.invitee!.email} has accepted your invite!`;
    }

    get text() {
        const { invitee, group } = this.invite;
        const url = `https://127.0.0.1:8081/store/${group!.id}`;
        return `
Hi there!

Good news! ${ invitee!.name || invitee!.email } has accepted your invite to join ${group!.name}!
Visit the following link to add them:

${url}

If you believe you may have received this email in error, please contact us at support@padlock.io

Best,
Martin`;
    }

    get html() {
        const { invitee, group } = this.invite;
        const url = `https://127.0.0.1:8081/store/${group!.id}`;
        return baseHTML(`

            ${p("Hi there!")}

            ${p(`
                Good news! <strong>${ invitee!.name || invitee!.email }</strong> has
                accepted your invite to join <strong>${group!.name}</strong>!
            `)}

            ${button("Add Them Now", url)}

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
