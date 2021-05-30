/// <reference lib="webworker" />
declare var self: ServiceWorkerGlobalScope;

import { precacheAndRoute } from "workbox-precaching";

// @ts-ignore
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("message", (event) => {
    const action = event.data && event.data.type;

    let response: any = undefined;

    switch (action) {
        case "INSTALL_UPDATE":
            self.skipWaiting();
            break;
        case "GET_VERSION":
            response = {
                version: "",
            };
            break;
    }

    event.ports[0].postMessage(response);
});
