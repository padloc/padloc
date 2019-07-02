// importScripts("node_modules/workbox-sw/build/workbox-sw.js");
importScripts("https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js");

declare const workbox: typeof import("workbox-sw");

// workbox.setConfig({
//     modulePathPrefix: "node_modules/workbox-sw/build/"
// });

workbox.precaching.precacheAndRoute([]);

workbox.routing.registerNavigationRoute(
    // Assuming '/single-page-app.html' has been precached,
    // look up its corresponding cache key.
    workbox.precaching.getCacheKeyForURL("index.html")
);
