import { Dialog } from "@padloc/app/src/elements/dialog";
import { css, customElement, html, state } from "@padloc/app/src/elements/lit";
import { $l } from "@padloc/locale/src/translate";
import "@padloc/app/src/elements/button";
import { diffJson } from "diff";
import "@padloc/app/src/elements/icon";
import { highlightJson } from "@padloc/app/src/lib/util";
import { ChangeLogEntry } from "@padloc/core/src/logging";

@customElement("pl-change-log-entry-dialog")
export class ChangeLogEntryDialog extends Dialog<ChangeLogEntry, void> {
    @state()
    private _entry: ChangeLogEntry;

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

    private _expandUnchanged(value: string) {
        this._expandedUnchanged.add(value);
        this.requestUpdate();
    }

    private _renderUnchanged(value: string) {
        const lines = value.split("\n");
        return this._expandedUnchanged.has(value) || lines.length < 10
            ? html`<span>${highlightJson(value)}</span>`
            : html`<span>${highlightJson(lines.slice(0, 3).join("\n"))}</span
                  ><pl-button
                      class="skinny margined ghost"
                      style="white-space: normal"
                      @click=${() => this._expandUnchanged(value)}
                      ><pl-icon icon="more"></pl-icon>
                      <div class="horizontally-margined">${lines.length - 8} ${$l("lines")}</div>
                      <pl-icon icon="more"></pl-icon></pl-button
                  ><span>${highlightJson(lines.slice(-4).join("\n"))}</span>`;
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

    show(event: ChangeLogEntry) {
        this._expandedUnchanged.clear();
        this._entry = event;
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
                <div class="big margined text-centering">Log Event</div>
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
                            <th>${$l("Class")}</th>
                            <td>${entry.objectKind}</td>
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

                        ${entry.before && entry.after
                            ? html`
                                  <tr>
                                      <th>${$l("Changes")}</th>
                                      <td>
                                          <pre><code>${this._renderDiff(entry.before, entry.after)}</code></pre>
                                      </td>
                                  </tr>
                              `
                            : html`
                                  <tr>
                                      <th>${$l("Object")}</th>
                                      <td>
                                          <pre><code>${highlightJson(
                                              JSON.stringify(entry.after || entry.before, null, 2)
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
