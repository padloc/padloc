require.config({
    baseUrl: "./",
    paths: {
        "safe": "src",
        "sjcl": "lib/sjcl"
    },
    shim: {
        "sjcl": {
            exports: "sjcl"
        }
    }
});