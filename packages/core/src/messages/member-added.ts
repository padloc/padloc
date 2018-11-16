import { Vault } from "../vault";
import { Message } from "../messenger";
import { base as baseHTML, paragraph as p, button } from "./base-html";

export class MemberAddedMessage implements Message {
    constructor(private vault: Vault) {}

    get title() {
        return `You've been added to the "${this.vault.name}" ${this.vault.kind} on Padlock!`;
    }

    get text() {
        const { name, id } = this.vault;
        const url = `https://127.0.0.1:8081/vaults/${id}`;

        return `
Hi there!

You now have access to ${name} on Padlock! You can view it using the following link:

${url}

If you believe you may have received this email in error, please contact us at support@padlock.io

Best,
Martin`;
    }

    get html() {
        const { name, id } = this.vault;
        const url = `https://127.0.0.1:8081/vaults/${id}`;
        return baseHTML(`

            ${p("Hi there!")}

            ${p(`
                You now have access to <strong>${name}</strong> on Padlock!
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
