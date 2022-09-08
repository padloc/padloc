import { Dialog } from "@padloc/app/src/elements/dialog";
import { css, customElement, html, state } from "@padloc/app/src/elements/lit";
import { Org, OrgMember, OrgRole } from "@padloc/core/src/org";
import { $l } from "@padloc/locale/src/translate";
import "@padloc/app/src/elements/button";
import "@padloc/app/src/elements/icon";
import { highlightJson } from "@padloc/app/src/lib/util";
import { alert, confirm } from "@padloc/app/src/lib/dialog";
import { app } from "@padloc/app/src/globals";

@customElement("pl-org-dialog")
export class OrgDialog extends Dialog<Org, void> {
    @state()
    private _org: Org;

    static styles = [
        ...Dialog.styles,
        css`
            :host {
                --pl-dialog-max-width: 50em;
                --pl-dialog-width: auto;
            }

            th {
                color: var(--color-highlight);
                text-align: left;
                vertical-align: top;
                white-space: nowrap;
            }

            th,
            td {
                padding: 0.5em;
            }

            /* td > table {
                font-size: var(--font-size-small);
                margin: 1.5em 0 0 -1em;
            } */

            pre {
                white-space: pre-wrap;
                word-break: break-all;
                overflow: auto;
                max-height: 30em;
                border: solid 1px var(--border-color);
                border-radius: var(--border-radius);
                padding: 0.5em;
                font-size: var(--font-size-small);
                width: 100%;
                resize: vertical;
            }

            pre[style*="height"] {
                max-height: unset;
            }

            .string {
                color: var(--color-foreground);
            }

            .number {
                color: purple;
            }

            .boolean {
                color: orange;
            }

            .null {
                color: magenta;
            }

            .key {
                color: #1111e9;
            }

            .added {
                color: green;
            }

            .removed {
                color: red;
            }
        `,
    ];

    async show(org: Org) {
        this._org = org;

        return super.show();
    }

    private async _deleteOrg() {
        this.open = false;
        const confirmed = await confirm(
            html`
                <div>
                    ${$l(
                        "Are you sure you want to delete this org? " +
                            "All associated vaults and the data within them will be lost and any active subscriptions will be canceled immediately. " +
                            "This action can not be undone!"
                    )}
                </div>
            `,
            $l("Delete"),
            $l("Cancel"),
            {
                type: "destructive",
                title: $l("Delete Org"),
                confirmLabel: $l("Delete"),
            }
        );

        this.open = true;

        if (!confirmed) {
            return;
        }

        this.loading = true;

        try {
            await app.api.deleteOrg(this._org.id);
            this.done();
        } catch (e) {
            this.open = false;
            await alert(e.message, { type: "warning" });
            this.open = true;
        }

        this.loading = false;
    }

    private _openAccount(member: OrgMember) {
        this.dispatchEvent(new CustomEvent("open-account", { detail: { member } }));
    }

    renderContent() {
        const org = this._org;
        if (!org) {
            return html``;
        }

        return html`
            <div>
                <div class="spacer"></div>
                <div class="big margined text-centering">${$l("Org")}</div>
                <table class="small double-margined">
                    <tbody>
                        <tr>
                            <th>${$l("Created")}</th>
                            <td>
                                ${new Intl.DateTimeFormat(undefined, {
                                    dateStyle: "short",
                                    timeStyle: "medium",
                                } as any).format(new Date(org.created))}
                            </td>
                        </tr>

                        <tr>
                            <th>${$l("Name")}</th>
                            <td>${org.name}</td>
                        </tr>

                        <tr>
                            <th>${$l("Members")}</th>
                            <td>
                                <div class="small horizontal spacing wrapping layout">
                                    ${org.members.map(
                                        (member) => html`
                                            <pl-button class="slim ghost" @click=${() => this._openAccount(member)}>
                                                <pl-icon icon="user"></pl-icon>
                                                <div class="horizontally-margined">
                                                    ${member.name ? `${member.name} <${member.email}>` : member.email}
                                                </div>
                                                ${member.role === OrgRole.Owner
                                                    ? html` <div class="tiny slim tag">${$l("owner")}</div> `
                                                    : member.role === OrgRole.Admin
                                                    ? html` <div class="tiny slim tag">${$l("admin")}</div> `
                                                    : ""}
                                            </pl-button>
                                        `
                                    )}
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <th>${$l("Raw Data")}</th>
                            <td>
                                <pre><code>${highlightJson(JSON.stringify(org.toRaw(), null, 2))}</code></pre>
                            </td>
                        </tr>

                        <tr>
                            <th></th>
                            <td>
                                <div class="horizontal spacing wrapping layout">
                                    <pl-button class="negative" @click=${() => this._deleteOrg()}>
                                        ${$l("Delete")}
                                    </pl-button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <pl-button class="small margined" @click=${() => this.dismiss()}>${$l("Done")}</pl-button>
            </div>
        `;
    }
}
