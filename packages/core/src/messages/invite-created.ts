import { Invite } from "../invite";
import { Message } from "../messenger";
import { base as baseHTML, paragraph as p, button } from "./base-html";

export class InviteCreatedMessage implements Message {
    constructor(public invite: Invite, public link: string) {}

    get title() {
        const { vault, invitor, purpose } = this.invite;
        return purpose === "confirm_membership"
            ? `Confirm your membership for the "${vault!.name}" vault on Padloc!`
            : `${invitor!.name || invitor!.email} wants you to join the "${vault!.name}" vault on Padloc!`;
    }

    get text() {
        const { vault, invitor, purpose } = this.invite;
        return `
Hi there!

        ${
            purpose === "confirm_membership"
                ? `Please use the link below to reconfirm your membership for the "${vault!.name}" vault!`
                : `You have been invited by ${invitor!.name || invitor!.email} to join their vault ` +
                  `"${vault!.name}" on Padloc! To accept the invite, please visit the link below:`
        }

${this.link}

If you believe you may have received this email in error, please contact us at support@padloc.app

Best,
Martin`;
    }

    get html() {
        const { vault, invitor, purpose } = this.invite;
        return baseHTML(`

            ${p("Hi there!")}

            ${p(
                purpose === "confirm_membership"
                    ? `Please use the link below to reconfirm your membership for the ` +
                      `<strong>${vault!.name}</strong> vault!`
                    : `You have been invited by <strong>${invitor!.name || invitor!.email}</strong> ` +
                      `to join their vault <strong>${vault!.name}</strong> on Padloc!
            `
            )}

            ${button(purpose === "confirm_membership" ? "Confirm Membership" : `Join ${vault!.name}`, this.link)}

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
