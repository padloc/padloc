import { Invite } from "../invite";
import { Message } from "../messenger";
import { base as baseHTML, paragraph as p, button } from "./base-html";

export class InviteCreatedMessage implements Message {
    constructor(public invite: Invite, public link: string) {}

    get title() {
        const { org, invitedBy, purpose } = this.invite;
        return purpose === "confirm_membership"
            ? `Confirm your membership for the "${org!.name}" org on Padloc!`
            : `${invitedBy!.name || invitedBy!.email} wants you to join the "${org!.name}" org on Padloc!`;
    }

    get text() {
        const { org, invitedBy, purpose } = this.invite;
        return `
Hi there!

        ${
            purpose === "confirm_membership"
                ? `Please use the link below to reconfirm your membership for the "${org!.name}" org!`
                : `You have been invited by ${invitedBy!.name || invitedBy!.email} to join their org ` +
                  `"${org!.name}" on Padloc! To accept the invite, please visit the link below:`
        }

${this.link}

If you believe you may have received this email in error, please contact us at support@padloc.app

Best,
The Padloc Team`;
    }

    get html() {
        const { org, invitedBy, purpose } = this.invite;
        return baseHTML(`

            ${p("Hi there!")}

            ${p(
                purpose === "confirm_membership"
                    ? `Please use the link below to reconfirm your membership for the ` +
                      `<strong>${org!.name}</strong> org!`
                    : `You have been invited by <strong>${invitedBy!.name || invitedBy!.email}</strong> ` +
                      `to join their org <strong>${org!.name}</strong> on Padloc!
            `
            )}

            ${button(purpose === "confirm_membership" ? "Confirm Membership" : `Join ${org!.name}`, this.link)}

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
