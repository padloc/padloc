import { Workbox } from "workbox-window";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { confirm } from "../dialog.js";

type Constructor<T> = new (...args: any[]) => T;

export function ServiceWorker<B extends Constructor<Object>>(baseClass: B) {
    return class extends baseClass {
        constructor(...args: any[]) {
            super(...args);
            this.initSW();
        }

        private _wb: Workbox;

        private async _updateReady() {
            console.log("update ready!");

            const confirmed = await confirm(
                $l("A new update is ready to install! Do you want to install it now?"),
                $l("Install & Reload")
            );

            if (confirmed) {
                // Assuming the user accepted the update, set up a listener
                // that will reload the page as soon as the previously waiting
                // service worker has taken control.
                this._wb.addEventListener("controlling", () => {
                    window.location.reload();
                });

                // Send a message telling the service worker to skip waiting.
                // This will trigger the `controlling` event handler above.
                // Note: for this to work, you have to add a message
                // listener in your service worker. See below.
                this._wb.messageSW({ type: "INSTALL_UPDATE" });
            }
        }

        initSW() {
            if (!("serviceWorker" in navigator)) {
                return;
            }

            console.log("initializing service worker");

            this._wb = new Workbox("/sw.js");

            // Add an event listener to detect when the registered
            // service worker has installed but is waiting to activate.
            this._wb.addEventListener("waiting", async event => {
                console.log("waiting...", event);

                const version = await event.target.messageSW({ type: "GET_VERSION" });

                console.log("version: ", version);

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
