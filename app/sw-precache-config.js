module.exports = {
    staticFileGlobs: [
        "manifest.json",
        "src/**/*",
        "vendor/**/*",
        "assets/**/*",
        "/node_modules/@webcomponents/webcomponentsjs/webcomponents-bundle.js"
    ],
    runtimeCaching: [
        {
            urlPattern: new RegExp("https://js.stripe.com/"),
            handler: "fastest"
        }
    ]
};
