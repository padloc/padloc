require.config({
    baseUrl: "./",
    paths: {
        "padlock": "src",
        "sjcl": "lib/sjcl",
        // If the chrome storage is available, use that, otherwise use the localStorage api
        "padlock/LocalSource": (typeof chrome !== "undefined") && chrome.storage ?
            "src/ChromeStorageSource" : "src/LocalStorageSource"
    },
    shim: {
        "sjcl": {
            exports: "sjcl"
        }
    }
});