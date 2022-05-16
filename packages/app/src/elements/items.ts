import { View } from "./view";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { ItemsList, ItemsFilter } from "./items-list";
import "./item-view";
import { customElement, property, query } from "lit/decorators.js";
import { html } from "lit";
import { wait } from "@padloc/core/src/util";
import { AuditType } from "@padloc/core/src/item";

@customElement("pl-items")
export class ItemsView extends Routing(StateMixin(View)) {
    routePattern = /^items(?:\/([^\/]+))?/;

    @property()
    selected: string | null = null;

    @property({ attribute: false })
    filter?: ItemsFilter;

    @query("pl-items-list")
    private _list: ItemsList;

    async handleRoute(
        [id]: [string],
        { vault, tag, favorites, attachments, recent, host, search, report }: { [prop: string]: string }
    ) {
        this.filter = {
            vault,
            tag,
            favorites: favorites === "true",
            attachments: attachments === "true",
            recent: recent === "true",
            host: host === "true",
            report: report as AuditType,
        };
        this.selected = id;

        if (this.active) {
            if (search) {
                this._list?.search(search, false);
            } else {
                this._list?.cancelSearch();
            }
        }

        // WEIRD workaround for a bug that caused problems with drag & drop on fields within the list
        // directly after unlocking the app (appears only in Chrome).
        // Somehow the page seems to enter a strange state where drag & drop events are not handled properly;
        // Focusing a text field seems to resolve that state for some reason
        if (this.active) {
            await this.updateComplete;
            await wait(100);
            const workaroundInput = this.renderRoot.querySelector("#workaroundInput") as HTMLInputElement;
            workaroundInput?.focus();
            await wait(100);
            workaroundInput?.blur();
        }
    }

    async updated(changes: Map<string, unknown>) {
        // WEIRD workaround for a bug that caused problems with drag & drop on fields within the list
        // directly after unlocking the app (appears only in Chrome).
        // Somehow the page seems to enter a strange state where drag & drop events are not handled properly;
        // Focusing a text field seems to resolve that state for some reason
        if (changes.has("active") && this.active) {
            await wait(100);
            const workaroundInput = this.renderRoot.querySelector("#workaroundInput") as HTMLInputElement;
            workaroundInput?.focus();
            await wait(100);
            workaroundInput?.blur();
        }
    }

    search() {
        this._list.search();
    }

    cancelSearch() {
        this._list.cancelSearch();
    }

    render() {
        return html`
            <div class="fullbleed pane layout ${!!this.selected ? "open" : ""}">
                <pl-items-list .selected=${this.selected || ""} .filter=${this.filter}></pl-items-list>

                <pl-item-view></pl-item-view>
            </div>

            <input id="workaroundInput" inputmode="none" style="position: absolute; z-index: -1; opacity: 0;"></input>
        `;
    }
}
