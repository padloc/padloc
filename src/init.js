/* jshint browser: true */
/* global padlock, chrome */

window.addEventListener("WebComponentsReady", function() {
    "use strict";

    var source = (typeof chrome !== "undefined") && chrome.storage ?
        new padlock.ChromeStorageSource() : new padlock.LocalStorageSource(),
        store = new padlock.Store(source),
        cloudHost = "https://cloud.padlock.io/",
        settings = new padlock.Settings({
            "sync_host": cloudHost,
            "sync_email": "",
            "sync_key": "",
            "sync_device": "",
            "sync_connected": false,
            "sync_auto": true,
            "default_fields": ["username", "password"],
            "order_by": "name"
        }, source),
        categories = new padlock.Categories(null, 3, source),
        collection = new padlock.Collection("default", store);

    var app = document.querySelector("padlock-app");
    app.init(collection, settings, categories);
});
