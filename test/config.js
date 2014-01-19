require.config({
    baseUrl: "../",
    paths: {
        "padlock": "src",
        "sjcl": "lib/sjcl"
    },
    shim: {
        "sjcl": {
            exports: "sjcl"
        }
    }
});