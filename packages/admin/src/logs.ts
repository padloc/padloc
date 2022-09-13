import { css, customElement, html, query, state } from "@padloc/app/src/elements/lit";
import { View } from "@padloc/app/src/elements/view";
import { $l } from "@padloc/locale/src/translate";
import "@padloc/app/src/elements/icon";
import { StateMixin } from "@padloc/app/src/mixins/state";
import { Routing } from "@padloc/app/src/mixins/routing";
import { LogEvent } from "@padloc/core/src/logging";
import { ListLogEventsParams } from "@padloc/core/src/api";
import "@padloc/app/src/elements/scroller";
import "@padloc/app/src/elements/list";
import "@padloc/app/src/elements/button";
import { Input } from "@padloc/app/src/elements/input";
import { Popover } from "@padloc/app/src/elements/popover";
import { singleton } from "@padloc/app/src/lib/singleton";
import { LogEventDialog } from "./log-event-dialog";
import "@padloc/app/src/elements/spinner";
import { alert } from "@padloc/app/src/lib/dialog";
import { Select } from "@padloc/app/src/elements/select";

@customElement("pl-admin-logs")
export class Logs extends StateMixin(Routing(View)) {
    readonly routePattern = /^logs(?:\/(\w+))?/;

    @state()
    private _events: LogEvent[] = [];

    @state()
    private _before?: Date;

    @state()
    private _after?: Date;

    @state()
    private _page = "storage";

    @state()
    private _loading = false;

    @state()
    private _emails: string[] = [];

    @state()
    private _eventsPerPage = 50;

    @query("#beforeInput")
    private _beforeInput: Input;

    @query("#afterInput")
    private _afterInput: Input;

    @query("#emailsInput")
    private _emailsInput: Input;

    @query("#timeRangePopover")
    private _timeRangePopover: Popover;

    @query("#eventsPerPageSelect")
    private _eventsPerPageSelect: Select;

    @singleton("pl-log-event-dialog")
    private _logEventDialog: LogEventDialog;

    private _offset = 0;

    handleRoute([page]: [string]) {
        console.log(page);

        if (!["storage", "requests"].includes(page)) {
            this.go("logs/storage");
            return;
        }

        this._page = page;
        this._loadEvents();
    }

    private async _loadEvents(offset = 0) {
        const before = this._before;
        const after = this._after;
        this._loading = true;
        try {
            const { events } = await this.app.api.listLogEvents(
                new ListLogEventsParams({
                    offset,
                    limit: this._eventsPerPage,
                    before,
                    after,
                    where:
                        this._page === "storage"
                            ? {
                                  key: "type",
                                  op: "like",
                                  val: "storage.*",
                              }
                            : { key: "type", val: "request" },
                    // types: this._page === "storage" ? ["storage.*"] : ["request"],
                    // emails: this._emails.length ? this._emails : undefined,
                })
            );
            this._events = events;
            this._offset = offset;
        } catch (e) {
            alert(e.message, { type: "warning" });
        }

        this._loading = false;
    }

    private _loadNext() {
        return this._loadEvents(this._offset + this._events.length);
    }

    private _loadPrevious() {
        return this._loadEvents(Math.max(this._offset - this._eventsPerPage, 0));
    }

    private _applyTimeRange() {
        this._before = this._beforeInput.value ? new Date(this._beforeInput.value) : undefined;
        this._after = this._afterInput.value ? new Date(this._afterInput.value) : undefined;
        this._loadEvents(0);
        this._timeRangePopover.hide();
    }

    private _formatDateTime(date: Date) {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: "short",
            timeStyle: "medium",
        } as any).format(date);
    }

    private _emailsInputHandler() {
        const emails = this._emailsInput.value.split(/[,;\s]+/);
        this._emails = [...new Set([...this._emails, ...emails.slice(0, -1).filter((e) => !!e)])];
        this._emailsInput.value = emails[emails.length - 1];
        this.requestUpdate();
    }

    private _emailsEnter() {
        const emails = this._emailsInput.value.split(/[,;\s]+/);
        this._emails = [...new Set([...this._emails, ...emails.filter((e) => !!e)])];
        this._emailsInput.value = "";
        this.requestUpdate();
        this._loadEvents(0);
    }

    private _emailsKeydown(e: KeyboardEvent) {
        if (e.key === "Backspace" && !this._emailsInput.value) {
            this._emails.pop();
            this.requestUpdate();
            this._loadEvents(0);
        }
    }

    private _isEmailValid(email: string) {
        return /\S+@\S+\.\S+/.test(email);
    }

    private _removeEmail(email: string) {
        this._emails = this._emails.filter((e) => e !== email);
        this.requestUpdate();
        this._loadEvents(0);
    }

    private _eventsPerPageSelected() {
        this._eventsPerPage = this._eventsPerPageSelect.value;
        this._loadEvents(0);
    }

    static styles = [
        ...View.styles,
        css`
            table {
                border-collapse: collapse;
                width: 100%;
            }

            thead th {
                font-weight: 600;
                position: sticky;
                top: 0;
                background: var(--color-background);
                text-align: left;
            }

            th > div {
                padding: 0.5em;
                border-bottom: solid 1px var(--border-color);
            }

            td {
                padding: 0.5em;
                text-align: left;
                border: solid 1px var(--border-color);
            }

            tbody tr:hover {
                cursor: pointer;
                color: var(--color-highlight);
            }

            tr:first-child td {
                border-top: none;
            }

            tr:last-child td {
                border-bottom: none;
            }

            tr :last-child {
                border-right: none;
            }

            tr :first-child {
                border-left: none;
            }

            #emailsInput {
                flex-wrap: wrap;
                padding: 0.25em;
                --input-padding: 0.3em 0.5em;
                border: none;
            }

            #emailsInput .tag pl-button {
                margin: -0.2em -0.3em -0.2em 0.3em;
            }
        `,
    ];

    render() {
        return html`
            <div class="fullbleed vertical layout">
                <header class="padded center-aligning spacing horizontal layout border-bottom">
                    <pl-icon icon="list"></pl-icon>
                    <div class="ellipsis">${$l("Logs")}</div>

                    <div class="stretch"></div>

                    <pl-button
                        class="small skinny transparent"
                        .toggled=${this._page === "storage"}
                        @click=${() => this.go("logs/storage")}
                    >
                        ${$l("Audit Logs")}
                    </pl-button>

                    <pl-button
                        class="small skinny transparent"
                        .toggled=${this._page === "requests"}
                        @click=${() => this.go("logs/requests")}
                    >
                        ${$l("API Requests")}
                    </pl-button>

                    <div class="stretch"></div>

                    <pl-button class="skinny transparent">
                        <div class="horizontal spacing center-aligning layout">
                            <pl-icon icon="time"></pl-icon>
                            ${this._after
                                ? html`<div class="small">${this._formatDateTime(this._after)}</div>
                                      ${this._before ? html`<div>-</div>` : ""} `
                                : ""}
                            ${this._before ? html`<div class="small">${this._formatDateTime(this._before)}</div>` : ""}
                        </div>
                    </pl-button>

                    <pl-popover id="timeRangePopover">
                        <div class="padded spacing vertical layout">
                            <div class="text-centering small subtle top-margined">${$l("Display events between")}</div>
                            <pl-input class="small slim" type="datetime-local" id="afterInput"></pl-input>
                            <div class="text-centering small subtle">${$l("and")}</div>
                            <pl-input class="small slim" type="datetime-local" id="beforeInput"></pl-input>
                            <pl-button class="small primary" @click=${this._applyTimeRange}>${$l("Apply")}</pl-button>
                        </div>
                    </pl-popover>

                    <pl-button class="skinny transparent" @click=${() => this._loadEvents(this._offset)}>
                        <pl-icon icon="refresh"></pl-icon>
                    </pl-button>
                </header>

                <div class="border-bottom">
                    <pl-input
                        id="emailsInput"
                        class="small"
                        .placeholder=${$l("Filter By Email Address...")}
                        type="email"
                        @enter=${this._emailsEnter}
                        @input=${this._emailsInputHandler}
                        @blur=${this._emailsEnter}
                        @keydown=${this._emailsKeydown}
                    >
                        <div class="horizontal wrapping spacing layout" slot="before">
                            ${this._emails.map(
                                (email) => html`
                                    <div
                                        class="small center-aligning horizontal layout tag ${this._isEmailValid(email)
                                            ? ""
                                            : "warning"}"
                                    >
                                        ${!this._isEmailValid(email) ? html`<pl-icon icon="warning"></pl-icon>` : ""}
                                        <div>${email}</div>
                                        <pl-button
                                            class="small skinny transparent"
                                            @click=${() => this._removeEmail(email)}
                                        >
                                            <pl-icon icon="cancel"></pl-icon>
                                        </pl-button>
                                    </div>
                                `
                            )}
                        </div>
                    </pl-input>
                </div>
                <div class="stretch scrolling">
                    ${this._page === "storage"
                        ? html`
                              <table class="small">
                                  <thead>
                                      <tr>
                                          <th><div>${$l("Time")}</div></th>
                                          <th><div>${$l("Class")}</div></th>
                                          <th><div>${$l("Action")}</div></th>
                                          <th><div>${$l("User")}</div></th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      ${this._events.map(
                                          (event) => html`
                                              <tr @click=${() => this._logEventDialog.show(event)}>
                                                  <td>${this._formatDateTime(new Date(event.time))}</td>
                                                  <td>${event.type.split(".")[1]}</td>
                                                  <td>${event.type.split(".")[2]}</td>
                                                  <td>
                                                      ${event.context?.account
                                                          ? event.context?.account.name
                                                              ? `${event.context.account.name} <${event.context.account.email}>`
                                                              : event.context.account.email
                                                          : ""}
                                                  </td>
                                              </tr>
                                          `
                                      )}
                                  </tbody>
                              </table>
                          `
                        : html`
                              <table class="small">
                                  <thead>
                                      <tr>
                                          <th><div>${$l("Time")}</div></th>
                                          <th><div>${$l("Endpoint")}</div></th>
                                          <th><div>${$l("User")}</div></th>
                                          <th><div>${$l("Response Time")}</div></th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      ${this._events.map(
                                          (event) => html`
                                              <tr @click=${() => this._logEventDialog.show(event)}>
                                                  <td>${this._formatDateTime(new Date(event.time))}</td>
                                                  <td>${event.data?.request?.method}</td>
                                                  <td>
                                                      ${event.context?.account
                                                          ? event.context?.account.name
                                                              ? `${event.context.account.name} <${event.context.account.email}>`
                                                              : event.context.account.email
                                                          : ""}
                                                  </td>
                                                  <td>${event.data?.request?.duration} ms</td>
                                              </tr>
                                          `
                                      )}
                                  </tbody>
                              </table>
                          `}
                </div>
                <div class="padded horizontal layout border-top">
                    <pl-select
                        id="eventsPerPageSelect"
                        class="small slim"
                        .options=${[
                            { value: 50, label: "50 items per page" },
                            { value: 100, label: "100 items per page" },
                            { value: 500, label: "500 items per page" },
                            { value: 1000, label: "1000 items per page" },
                        ]}
                        .value=${this._eventsPerPage as any}
                        @change=${this._eventsPerPageSelected}
                    ></pl-select>
                    <div class="stretch"></div>
                    <pl-button
                        class="slim transparent"
                        @click=${() => this._loadPrevious()}
                        ?disabled=${this._offset === 0}
                    >
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>
                    <div class="padded">${this._offset} - ${this._offset + this._events.length}</div>
                    <pl-button
                        class="slim transparent"
                        @click=${() => this._loadNext()}
                        ?disabled=${this._events.length < this._eventsPerPage}
                    >
                        <pl-icon icon="forward"></pl-icon>
                    </pl-button>
                </div>
            </div>

            <div class="fullbleed centering layout scrim" ?hidden=${!this._loading}>
                <pl-spinner .active=${this._loading}></pl-spinner>
            </div>
        `;
    }
}
