import { Invite } from "../invite";
import { Message } from "../messenger";
import { base as baseHTML, paragraph as p, button } from "./base-html";

export class InviteAcceptedMessage implements Message {
    constructor(private invite: Invite, private link: string) {}

    get title() {
        return `${this.invite.invitee!.name || this.invite.invitee!.email} has accepted your invite!`;
    }

    get text() {
        const { invitee, vault } = this.invite;
        return `
Hi there!

Good news! ${ invitee!.name || invitee!.email } has accepted your invite to join ${vault!.name}!
Visit the following link to add them:

${this.link}

If you believe you may have received this email in error, please contact us at support@padloc.app

Best,
Martin`;
    }

    get html() {
        const { invitee, vault } = this.invite;
        return baseHTML(`

            ${p("Hi there!")}

            ${p(`
                Good news! <strong>${ invitee!.name || invitee!.email }</strong> has
                accepted your invite to join <strong>${vault!.name}</strong>!
            `)}

            ${button("Add Them Now", this.link)}

            ${p(`
                If you believe you may have received this email in error, please contact us at <strong>support@padloc.app</strong>
            `)}

            ${p(`
                Best,<br/>
                Martin
            `)}
        `);
    }
}
