import { init, track, setTrackingID } from "@padlock/core/lib/tracking.js";
import { Client } from "@padlock/core/lib/client.js";
import { DataMixin } from ".";

const startedLoading = new Date().getTime();

init(new Client(DataMixin.settings));

export function AnalyticsMixin(superClass) {
    return class AnalyticsMixin extends superClass {
        constructor() {
            super();
            const stats = this.app.stats;

            this.listen("data-exported", () => this.app.setStats({ lastExport: new Date().getTime() }));

            this.listen("settings-changed", () => {
                this.app.setStats({
                    syncCustomHost: this.settings.syncCustomHost
                });
            });

            this.listen("data-initialized", () => {
                track("Setup", {
                    "With Email": !!this.settings.syncEmail
                });
            });

            this.listen("data-loaded", () => track("Unlock"));

            this.listen("data-unloaded", () => track("Lock"));

            this.listen("data-reset", () => {
                track("Reset Local Data").then(() => setTrackingID(""));
            });

            this.listen("sync-connect-start", e => {
                track("Start Pairing", {
                    Source: stats.pairingSource,
                    Email: e.detail.email
                });
                this.app.setStats({ startedPairing: new Date().getTime() });
            });

            this.listen("sync-connect-success", () => {
                track("Finish Pairing", {
                    Success: true,
                    Source: stats.pairingSource,
                    $duration: (new Date().getTime() - stats.startedPairing) / 1000
                });
            });

            this.listen("sync-connect-cancel", () => {
                track("Finish Pairing", {
                    Success: false,
                    Canceled: true,
                    Source: stats.pairingSource,
                    $duration: (new Date().getTime() - stats.startedPairing) / 1000
                });
            });

            this.listen("sync-disconnect", () => track("Unpair").then(() => setTrackingID("")));

            let startedSync;
            this.listen("sync-start", () => (startedSync = new Date().getTime()));

            this.listen("sync-success", e => {
                this.app.setStats({ lastSync: new Date().getTime() }).then(() =>
                    track("Synchronize", {
                        Success: true,
                        "Auto Sync": e.detail ? e.detail.auto : false,
                        $duration: (new Date().getTime() - startedSync) / 1000
                    })
                );
            });

            this.listen("sync-fail", e =>
                track("Synchronize", {
                    Success: false,
                    "Auto Sync": e.detail.auto,
                    "Error Code": e.detail.error.code,
                    $duration: (new Date().getTime() - startedSync) / 1000
                })
            );
        }

        connectedCallback() {
            super.connectedCallback();
            this.hasData().then(hasData =>
                track("Launch", {
                    "Clean Launch": !hasData,
                    $duration: (new Date().getTime() - startedLoading) / 1000
                })
            );
        }

        track(event, props) {
            // Don't track events if user is using a custom padlock cloud instance
            if (DataMixin.settings.syncCustomHost) {
                return Promise.resolve();
            }
            track(event, props);
        }
    };
}
