import { Dialog } from "@padloc/app/src/elements/dialog";
import { css, customElement, html, state } from "@padloc/app/src/elements/lit";
import { Account } from "@padloc/core/src/account";
import { $l } from "@padloc/locale/src/translate";
import "@padloc/app/src/elements/button";
import "@padloc/app/src/elements/icon";
import { highlightJson } from "@padloc/app/src/lib/util";

@customElement("pl-account-dialog")
export class AccountDialog extends Dialog<Account, void> {
    @state()
    private _account: Account;

    @state()
    private _expandedUnchanged = new Set<string>();

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

    show(event: Account) {
        this._expandedUnchanged.clear();
        this._account = event;
        return super.show();
    }

    renderContent() {
        const account = this._account;
        if (!account) {
            return html``;
        }

        return html`
            <div>
                <div class="spacer"></div>
                <div class="big margined text-centering">Log Event</div>
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
                            <th>${$l("Raw Data")}</th>
                            <td>
                                <pre><code>${highlightJson(JSON.stringify(account.toRaw(), null, 2))}</code></pre>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <pl-button class="small margined" @click=${() => this.dismiss()}>${$l("Done")}</pl-button>
            </div>
        `;
    }
}
