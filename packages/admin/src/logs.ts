import { customElement, html, state } from "@padloc/app/src/elements/lit";
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

@customElement("pl-admin-logs")
export class Logs extends StateMixin(Routing(View)) {
    readonly routePattern = /^logs(?:\/(\w+))?/;

    static styles = [...View.styles];

    @state()
    private _events: LogEvent[] = [];

    private _offset = 0;

    private _eventsPerPage = 20;

    handleRoute() {
        this._loadEvents();
    }

    private async _loadEvents(offset = 0) {
        const { events } = await this.app.api.getLogs(new GetLogsParams({ offset, limit: this._eventsPerPage }));
        this._events = events;
        this._offset = offset;
    }

    private _loadNext() {
        return this._loadEvents(this._offset + this._events.length);
    }

    private _loadPrevious() {
        return this._loadEvents(Math.max(this._offset - this._eventsPerPage, 0));
    }

    render() {
        return html`
            <div class="fullbleed vertical layout">
                <header class="padded center-aligning spacing horizontal layout">
                    <pl-icon icon="settings"></pl-icon>
                    <div class="stretch ellipsis">${$l("Logs")}</div>
                </header>
                <pl-scroller class="stretch">
                    <pl-list>
                        ${this._events.map(
                            (event) => html`
                                <div class="padded horizontal spacing layout list-item">
                                    <div>
                                        ${new Intl.DateTimeFormat(undefined, {
                                            dateStyle: "short",
                                            timeStyle: "medium",
                                        } as any).format(new Date(event.time))}
                                    </div>
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
