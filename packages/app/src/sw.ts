/// <reference lib="webworker" />
declare var self: ServiceWorkerGlobalScope;

import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";

precacheAndRoute(self.__WB_MANIFEST);

// Aggressively cache favicons fetched via icons.duckduckgo.com
registerRoute(
    ({ request }) => request.url.startsWith("https://icons.duckduckgo.com"),
    new CacheFirst({
        cacheName: "image-cache",
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
