importScripts("https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js");

declare const workbox: typeof import("workbox-sw");

// @ts-ignore
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

workbox.routing.registerNavigationRoute(workbox.precaching.getCacheKeyForURL("index.html"));

addEventListener("message", event => {
    const action = event.data && event.data.type;

    let response: any = undefined;

    switch (action) {
        case "INSTALL_UPDATE":
            console.log("installing update");
            // @ts-ignore
            skipWaiting();
            break;
        case "GET_VERSION":
            response = "3.0.0-beta.1";
            break;
    }

    event.ports[0].postMessage(response);
});
