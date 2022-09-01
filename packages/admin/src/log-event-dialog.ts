import { Dialog } from "@padloc/app/src/elements/dialog";
import { css, customElement, html, state, unsafeHTML } from "@padloc/app/src/elements/lit";
import { LogEvent } from "@padloc/core/src/logging";
import { $l } from "@padloc/locale/src/translate";
import "../../app/src/elements/button";
import { diffJson } from "diff";
import "../../app/src/elements/icon";

@customElement("pl-log-event-dialog")
export class LogEventDialog extends Dialog<LogEvent, void> {
    @state()
    private _event: LogEvent;

    @state()
    private _expandedUnchanged = new Set<string>();

    static styles = [
        ...Dialog.styles,
        css`
            :host {
                --pl-dialog-max-width: 50em;
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

    private _highlight(json: string) {
        json = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        json = json.replace(
            /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
            function (match) {
                var cls = "number";
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = "key";
                    } else {
                        cls = "string";
                    }
                } else if (/true|false/.test(match)) {
                    cls = "boolean";
                } else if (/null/.test(match)) {
                    cls = "null";
                }
                return '<span class="' + cls + '">' + match + "</span>";
            }
        );

        return html`${unsafeHTML(json)}`;
    }

    private _expandUnchanged(value: string) {
        this._expandedUnchanged.add(value);
        this.requestUpdate();
    }

    private _renderUnchanged(value: string) {
        const lines = value.split("\n");
        return this._expandedUnchanged.has(value) || lines.length < 10
            ? html`<span>${this._highlight(value)}</span>`
            : html`<span>${this._highlight(lines.slice(0, 3).join("\n"))}</span
                  ><pl-button
                      class="skinny margined ghost"
                      style="white-space: normal"
                      @click=${() => this._expandUnchanged(value)}
                      ><pl-icon icon="more"></pl-icon>
                      <div class="horizontally-margined">${lines.length - 8} ${$l("lines")}</div>
                      <pl-icon icon="more"></pl-icon></pl-button
                  ><span>${this._highlight(lines.slice(-4).join("\n"))}</span>`;
    }

    private _renderDiff(before: object, after: object) {
        const diff = diffJson(before, after);
        return html`${diff.map((part) =>
            part.added
                ? html`<span class="added">${part.value.replace(/^ /gm, "+")}</span>`
                : part.removed
                ? html`<span class="removed">${part.value.replace(/^ /gm, "-")}</span>`
                : this._renderUnchanged(part.value)
        )}`;
    }

    show(event: LogEvent) {
        this._expandedUnchanged.clear();
        this._event = event;
        return super.show();
    }

    renderContent() {
        const event = this._event;
        if (!event) {
            return html``;
        }

        const device = event.context?.device;
        const location = event.context?.location;

        return html`
            <div>
                <div class="spacer"></div>
                <div class="big margined text-centering">Log Event</div>
                <table class="small double-margined">
                    <tbody>
                        <tr>
                            <th>${$l("Time")}</th>
                            <td>
                                ${new Intl.DateTimeFormat(undefined, {
                                    dateStyle: "short",
                                    timeStyle: "medium",
                                } as any).format(new Date(event.time))}
                            </td>
                        </tr>
                        <tr>
                            <th>${$l("Type")}</th>
                            <td>${event.type}</td>
                        </tr>
                        <tr>
                            <th>${$l("User")}</th>
                            <td>
                                ${event.context?.account
                                    ? event.context?.account.name
                                        ? `${event.context.account.name} <${event.context.account.email}>`
                                        : event.context.account.email
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

                        ${event.data.object && event.data.before
                            ? html`
                                  <tr>
                                      <th>${$l("Changes")}</th>
                                      <td>
                                          <pre><code>${this._renderDiff(
                                              event.data.before,
                                              event.data.object
                                          )}</code></pre>
                                      </td>
                                  </tr>
                              `
                            : html`
                                  <tr>
                                      <th>${$l("Data")}</th>
                                      <td>
                                          <pre><code>${this._highlight(
                                              JSON.stringify(event.data, null, 2)
                                          )}</code></pre>
                                      </td>
                                  </tr>
                              `}
                    </tbody>
                </table>

                <pl-button class="small margined" @click=${() => this.dismiss()}>${$l("Done")}</pl-button>
            </div>
        `;
    }
}
