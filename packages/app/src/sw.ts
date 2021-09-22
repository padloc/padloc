/// <reference lib="webworker" />
declare var self: ServiceWorkerGlobalScope;

import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
    new NavigationRoute(createHandlerBoundToURL("/index.html"), {
        denylist: [new RegExp("/callback/")],
    })
);

registerRoute(
    new NavigationRoute(createHandlerBoundToURL("/callback/index.html"), {
        allowlist: [new RegExp("/callback/")],
    })
);

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
