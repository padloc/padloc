import { Dialog } from "@padloc/app/src/elements/dialog";
import { css, customElement, html, state } from "@padloc/app/src/elements/lit";
import { Account } from "@padloc/core/src/account";
import { $l } from "@padloc/locale/src/translate";
import "@padloc/app/src/elements/button";
import "@padloc/app/src/elements/icon";
import { highlightJson } from "@padloc/app/src/lib/util";
import { alert, confirm } from "@padloc/app/src/lib/dialog";
import { app } from "@padloc/app/src/globals";
import { OrgInfo } from "@padloc/core/src/org";

@customElement("pl-account-dialog")
export class AccountDialog extends Dialog<Account, void> {
    @state()
    private _account: Account;

    // private _changes: LogEvent[];

    async show(account: Account) {
        this._account = account;

        // const { events } = await app.api.listLogEvents(
        //     new ListLogEventsParams({
        //         query: {
        //             op: "and",
        //             queries: [
        //                 { path: "type", op: "regex", value: "storage\\..*" },
        //                 { path: "data.object.id" as any, value: this._account.id },
        //             ],
        //         },
        //     })
        // );

        // this._changes = events;

        // console.log(this._changes);

        return super.show();
    }

    private _openOrg(org: OrgInfo) {
        this.dispatchEvent(new CustomEvent("open-org", { detail: { org } }));
    }

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

    private async _deleteAccount() {
        const ownedOrgs = this._account.orgs.filter((org) => org.owner?.accountId === this._account.id);
        this.open = false;
        const confirmed = await confirm(
            html`
                <div>
                    ${$l(
                        "Are you sure you want to delete this account? " +
                            "All associated vaults and the data within them will be lost and any active subscriptions will be canceled immediately. " +
                            "This action can not be undone!"
                    )}
                </div>
                ${ownedOrgs.length
                    ? html`
                          <div class="padded top-margined negative highlighted box">
                              <strong>WARNING:</strong> ${$l(
                                  "The following organizations are owned by you and will be deleted along with your account:"
                              )}
                              <strong>${ownedOrgs.map((org) => org.name).join(", ")}</strong>
                          </div>
                      `
                    : ""}
            `,
            $l("Delete"),
            $l("Cancel"),
            {
                type: "destructive",
                title: $l("Delete Account"),
                confirmLabel: $l("Delete"),
            }
        );

        this.open = true;

        if (!confirmed) {
            return;
        }

        this.loading = true;

        try {
            await app.api.deleteAccount(this._account.id);
            this.done();
        } catch (e) {
            this.open = false;
            await alert(e.message, { type: "warning" });
            this.open = true;
        }

        this.loading = false;
    }

    renderContent() {
        const account = this._account;
        if (!account) {
            return html``;
        }

        return html`
            <div>
                <div class="spacer"></div>
                <div class="big margined text-centering">${$l("Account")}</div>
                <table class="small double-margined">
                    <tbody>
                        <tr>
                            <th>${$l("Created")}</th>
                            <td>
                                ${new Intl.DateTimeFormat(undefined, {
                                    dateStyle: "short",
                                    timeStyle: "medium",
                                } as any).format(new Date(account.created))}
                            </td>
                        </tr>

                        <tr>
                            <th>${$l("Email")}</th>
                            <td>${account.email}</td>
                        </tr>

                        <tr>
                            <th>${$l("Name")}</th>
                            <td>${account.name}</td>
                        </tr>

                        <tr>
                            <th>${$l("Orgs")}</th>
                            <td>
                                <div class="horizontal spacing wrapping layout">
                                    ${this._account.orgs.map((org) => {
                                        return html`
                                            <pl-button class="slim ghost" @click=${() => this._openOrg(org)}>
                                                <pl-icon icon="org"></pl-icon>
                                                <div class="horizontally-margined">${org.name}</div>
                                                ${org.owner?.accountId === this._account.id
                                                    ? html` <div class="tiny slim tag">${$l("owner")}</div> `
                                                    : ""}
                                            </pl-button>
                                        `;
                                    })}
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <th>${$l("Raw Data")}</th>
                            <td>
                                <pre><code>${highlightJson(JSON.stringify(account.toRaw(), null, 2))}</code></pre>
                            </td>
                        </tr>

                        <tr>
                            <th></th>
                            <td>
                                <div class="horizontal spacing wrapping layout">
                                    <pl-button class="negative" @click=${() => this._deleteAccount()}>
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
