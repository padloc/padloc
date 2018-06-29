import { MutableData } from "@polymer/polymer/lib/mixins/mutable-data";
import { Record } from "@padlock/core/lib/data.js";
import { App } from "@padlock/core/lib/app.js";
import { setProvider } from "@padlock/core/lib/crypto.js";
import WebCryptoProvider from "@padlock/core/lib/webcrypto-provider.js";
// import { getDesktopSettings } from "@padlock/core/lib/platform.js";
import { formatDateFromNow } from "@padlock/core/lib/util.js";

setProvider(WebCryptoProvider);
export const app = (window.app = new App());

// const desktopSettings = getDesktopSettings();
// const dbPath = desktopSettings ? desktopSettings.get("dbPath") : "data.pls";
// const localSource = new EncryptedSource(new FileSource(dbPath));

function filterByString(fs, rec) {
    if (!fs) {
        return true;
    }
    const words = fs.toLowerCase().split(" ");
    const content = rec.tags
        .concat([rec.name])
        .join(" ")
        .toLowerCase();
    return words.some(word => content.search(word) !== -1);
}

export function DataMixin(superClass) {
    return class DataMixin extends MutableData(superClass) {
        static get properties() {
            return {
                state: {
                    type: Object,
                    value: app.state
                },
                filterString: {
                    type: String,
                    value: ""
                },
                records: {
                    type: Array,
                    notify: true,
                    computed: "_filterAndSort(state.currentStore.records, filterString)"
                }
            };
        }

        constructor() {
            super();
            if (!this.notifyPath) {
                return;
            }
            app.addEventListener("state-changed", e => {
                this._stateChanged && this._stateChanged(this.state);
                for (const path of e.detail.paths) {
                    this.notifyPath(path ? `state.${path}` : `state`);
                }
            });
        }

        get app() {
            return app;
        }

        get password() {
            return app.password;
        }

        _filterAndSort() {
            if (!this.state.currentStore) {
                return [];
            }
            let records = this.state.currentStore.records.filter(
                r => !r.removed && filterByString(this.filterString, r)
            );
            this._recentCount = records.length > 10 ? 3 : 0;
            const recent = records
                .sort((a, b) => {
                    return (b.lastUsed || b.updated).getTime() - (a.lastUsed || a.updated).getTime();
                })
                .slice(0, this._recentCount);
            records = records.slice(this._recentCount);
            return recent.concat(records.sort((a, b) => Record.compare(a, b)));
        }
    };
}

export function StateMixin(superClass) {
    return class StateMixin extends superClass {
        constructor() {
            super();
            this.app = app;
            app.addEventListener("state-changed", () => {
                this._stateChanged && this._stateChanged(app.state);
            });
        }
    };
}

Object.assign(DataMixin, {
    app
});
