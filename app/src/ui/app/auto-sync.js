import '../base/base.js';

padlock.AutoSyncMixin = (superClass) => {

    return class AutoSyncMixin extends superClass {

        constructor() {
            super();
            const debouncedSynchronize = padlock.util.debounce(() => this.synchronize(true), 1000);
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

};
