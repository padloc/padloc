import { customElement, html, query, state } from "@padloc/app/src/elements/lit";
import { View } from "@padloc/app/src/elements/view";
import { $l } from "@padloc/locale/src/translate";
import "@padloc/app/src/elements/icon";
import { StateMixin } from "@padloc/app/src/mixins/state";
import { Routing } from "@padloc/app/src/mixins/routing";
import { LogEvent } from "@padloc/core/src/logging";
import { GetLogsParams } from "@padloc/core/src/api";
import "@padloc/app/src/elements/scroller";
import "@padloc/app/src/elements/list";
import "@padloc/app/src/elements/button";
import "../../app/src/elements/input";
import "../../app/src/elements/popover";
import { Input } from "../../app/src/elements/input";
import { Popover } from "../../app/src/elements/popover";

@customElement("pl-admin-logs")
export class Logs extends StateMixin(Routing(View)) {
    readonly routePattern = /^logs(?:\/(\w+))?/;

    static styles = [...View.styles];

    @state()
    private _events: LogEvent[] = [];

    @state()
    private _before?: Date;

    @state()
    private _after?: Date;

    @query("#beforeInput")
    private _beforeInput: Input;

    @query("#afterInput")
    private _afterInput: Input;

    @query("#timeRangePopover")
    private _timeRangePopover: Popover;

    private _offset = 0;

    private _eventsPerPage = 1000;

    handleRoute() {
        this._loadEvents();
    }

    private async _loadEvents(offset = 0) {
        const before = this._before;
        const after = this._after;
        const { events } = await this.app.api.getLogs(
            new GetLogsParams({
                offset,
                limit: this._eventsPerPage,
                before,
                after,
            })
        );
        this._events = events;
        this._offset = offset;
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

    render() {
        return html`
            <div class="fullbleed vertical layout">
                <header class="padded center-aligning spacing horizontal layout">
                    <pl-icon icon="settings"></pl-icon>
                    <div class="stretch ellipsis">${$l("Logs")}</div>

                    <pl-button class="slim transparent">
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
                </header>
                <pl-scroller class="stretch">
                    <pl-list>
                        ${this._events.map(
                            (event) => html`
                                <div class="small padded horizontal spacing layout list-item">
                                    <div>${this._formatDateTime(new Date(event.time))}</div>
                                    <div>
                                        ${event.context?.account
                                            ? event.context?.account.name
                                                ? `${event.context.account.name} <${event.context.account.email}>`
                                                : event.context.account.email
                                            : ""}
                                    </div>
                                    <div>${event.type}</div>
                                </div>
                            `
                        )}
                    </pl-list>
                </pl-scroller>
                <div class="padded horizontal layout">
                    <div class="stretch"></div>
                    <pl-button
                        class="slim transparent"
                        @click=${() => this._loadPrevious()}
                        ?disabled=${this._offset === 0}
                    >
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>
                    <div class="padded">${this._offset} - ${this._offset + this._events.length}</div>
                    <pl-button class="slim transparent" @click=${() => this._loadNext()}>
                        <pl-icon icon="forward"></pl-icon>
                    </pl-button>
                </div>
            </div>
        `;
    }
}
