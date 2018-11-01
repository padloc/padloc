import { FilterParams } from "@padlock/core/lib/app.js";
import { Record } from "@padlock/core/lib/data.js";
import { Vault } from "@padlock/core/lib/vault.js";
import { shared, mixins, config } from "../styles";
import { router } from "../init";
import { element, property, html, query } from "./base.js";
import { View } from "./view.js";
import { BrowseList } from "./browse-list.js";
import { RecordView } from "./record-view.js";
import "./icon.js";
import "./browse-filter.js";

@element("pl-browse")
export class Browse extends View {
    @property()
    item: { record: Record; vault: Vault } | null = null;
    @query("pl-browse-list")
    private _list: BrowseList;
    @query("pl-record-view")
    private _recordView: RecordView;

    render() {
        return html`
            ${shared}

            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                }

                main {
                    display: flex;
                }

                pl-browse-list {
                    width: 400px;
                    margin-right: 2px;
                }

                pl-record-view {
                    flex: 1;
                }

                header {
                    overflow: visible;
                    z-index: 10;
                }

                pl-browse-filter {
                    flex: 1;
                    width: 0;
                }

                @media (max-width: ${config.narrowWidth}px) {
                    pl-record-view {
                        ${mixins.fullbleed()};
                        z-index: 10;
                    }

                    pl-browse-list {
                        flex: 1;
                        margin-right: 0;
                    }

                    pl-record-view, pl-browse-list, header {
                        transition: transform 0.3s;
                    }

                    pl-record-view:not([active]) {
                        transform: translate(100%, 0);
                    }

                    pl-browse-list:not([active]),
                    header:not([active]) {
                        transform: translate(-50%, 0);
                    }
                }

            </style>

            <header ?active=${!this.item}>

                <pl-icon icon="settings" class="tap" @click=${() => router.go("settings")}></pl-icon>

                <pl-browse-filter></pl-browse-filter>

                <pl-icon icon="vaults" class="tap" @click=${() => router.go("vaults")}></pl-icon>

            </header>

            <main>

                <pl-browse-list ?active=${!this.item}></pl-browse-list>

                <pl-record-view
                    ?active=${!!this.item}
                    .record=${this.item && this.item.record}
                    .vault=${this.item && this.item.vault}>
                </pl-record-view>

            </main>
        `;
    }

    filter(params: FilterParams) {
        this._list.filter(params);
    }
}
