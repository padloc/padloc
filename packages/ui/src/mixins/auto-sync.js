import { debounce } from "@padlock/core/lib/util.js";

export function AutoSyncMixin(superClass) {
    return class AutoSyncMixin extends superClass {
        constructor() {
            super();
            const debouncedSynchronize = debounce(() => this.synchronize(true), 1000);
            const autoSync = () => {
                if (this.settings.syncAuto && this.settings.syncConnected) {
                    debouncedSynchronize();
                }
            };
            this.listen("record-changed", autoSync);
            this.listen("record-deleted", autoSync);
            this.listen("data-loaded", autoSync);
        }
    };
}
