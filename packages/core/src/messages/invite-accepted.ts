import { Invite } from "../invite";
import { Message } from "../messenger";
import { base as baseHTML, paragraph as p, button } from "./base-html";

export class InviteAcceptedMessage implements Message {
    constructor(private invite: Invite, private link: string) {}

    get title() {
        return `${this.invite.invitee!.name || this.invite.email} has accepted your invite!`;
    }

    get text() {
        const { invitee, org, email } = this.invite;
        return `
Hi there!

Good news! ${ invitee!.name || email } has accepted your invite to join ${org!.name}!
Visit the following link to add them:

${this.link}

If you believe you may have received this email in error, please contact us at support@padloc.app

Best,
The Padloc Team`;
    }

    get html() {
        const { invitee, org, email } = this.invite;
        return baseHTML(`

            ${p("Hi there!")}

            ${p(`
                Good news! <strong>${ invitee!.name || email }</strong> has
                accepted your invite to join <strong>${org!.name}</strong>!
            `)}

            ${button("Add Them Now", this.link)}

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
