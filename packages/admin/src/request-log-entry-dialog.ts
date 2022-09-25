import { Dialog } from "@padloc/app/src/elements/dialog";
import { css, customElement, html, state } from "@padloc/app/src/elements/lit";
import { RequestLogEntry } from "@padloc/core/src/logging";
import { $l } from "@padloc/locale/src/translate";
import "@padloc/app/src/elements/button";
import "@padloc/app/src/elements/icon";
import { highlightJson } from "@padloc/app/src/lib/util";

@customElement("pl-request-log-entry-dialog")
export class RequestLogEntryDialog extends Dialog<RequestLogEntry, void> {
    @state()
    private _entry: RequestLogEntry;

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
        `,
    ];

    show(entry: RequestLogEntry) {
        this._entry = entry;
        return super.show();
    }

    renderContent() {
        const entry = this._entry;
        if (!entry) {
            return html``;
        }

        const device = entry.context?.device;
        const location = entry.context?.location;

        return html`
            <div>
                <div class="spacer"></div>
                <div class="big margined text-centering">${$l("Request")}</div>
                <table class="small double-margined">
                    <tbody>
                        <tr>
                            <th>${$l("Time")}</th>
                            <td>
                                ${new Intl.DateTimeFormat(undefined, {
                                    dateStyle: "short",
                                    timeStyle: "medium",
                                } as any).format(new Date(entry.time))}
                            </td>
                        </tr>
                        <tr>
                            <th>${$l("Method")}</th>
                            <td>${entry.request.method}</td>
                        </tr>
                        <tr>
                            <th>${$l("Response Time")}</th>
                            <td>${entry.responseTime} ms</td>
                        </tr>
                        <tr>
                            <th>${$l("User")}</th>
                            <td>
                                ${entry.context?.account
                                    ? entry.context?.account.name
                                        ? `${entry.context.account.name} <${entry.context.account.email}>`
                                        : entry.context.account.email
                                    : ""}
                            </td>
                        </tr>
                        ${device
                            ? html`
                                  <tr>
                                      <th>${$l("Device")}</th>
                                      <td>${device.description}, ${device.platform} ${device.osVersion}</td>
                                  </tr>
                                  <tr>
                                      <th>${$l("App Version")}</th>
                                      <td>${device.appVersion}</td>
                                  </tr>
                              `
                            : ""}

                        <tr>
                            <th>${$l("Location")}</th>
                            <td>${location ? `${location.city}, ${location.country}` : $l("Unknown Location")}</td>
                        </tr>

                        <tr>
                            <th>${$l("Params")}</th>
                            <td>
                                <pre><code>${highlightJson(JSON.stringify(entry.request.params, null, 2))}</code></pre>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <pl-button class="small margined" @click=${() => this.dismiss()}>${$l("Done")}</pl-button>
            </div>
        `;
    }
}
