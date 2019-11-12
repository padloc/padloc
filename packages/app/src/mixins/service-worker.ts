import { Workbox } from "workbox-window";
import { translate as $l } from "@padloc/locale/src/translate";
import { confirm } from "../lib/dialog";

type Constructor<T> = new (...args: any[]) => T;

export function ServiceWorker<B extends Constructor<Object>>(baseClass: B) {
    return class extends baseClass {
        constructor(...args: any[]) {
            super(...args);
            if (!process.env.PL_DISABLE_SW) {
                this.initSW();
            }
        }

        private _wb: Workbox;

        private async _updateReady() {
            const confirmed = await confirm(
                $l("A new update is ready to install! Do you want to install it now?"),
                $l("Install & Reload"),
                $l("Later"),
                { preventAutoClose: true }
            );

            if (confirmed) {
                // set up a listener that will reload the page as soon as the
                // previously waiting service worker has taken control.
                this._wb.addEventListener("controlling", () => {
                    window.location.reload();
                });

                // Send a message telling the service worker to skip waiting.
                // This will trigger the `controlling` event handler above.
                this._wb.messageSW({ type: "INSTALL_UPDATE" });
            }
        }

        initSW() {
            if (!("serviceWorker" in navigator)) {
                return;
            }

            this._wb = new Workbox("/sw.js");

            // Add an event listener to detect when the registered
            // service worker has installed but is waiting to activate.
            this._wb.addEventListener("waiting", () => {
                setTimeout(() => {
                    this._updateReady();
                }, 1000);
            });

            this._wb.register();
        }

        checkForUpdates() {
            this._wb.register();
        }
    };
}
