const { resolve, join } = require("path");
const { EnvironmentPlugin } = require("webpack");

const rootDir = resolve(__dirname, "../..");
const assetsDir = resolve(rootDir, process.env.PL_ASSETS_DIR || "assets");
const { version } = require(resolve(__dirname, "package.json"));
const { name, description, author, scheme, terms_of_service } = require(join(assetsDir, "manifest.json"));

module.exports = [
    {
        target: "electron-main",
        entry: {
            main: resolve(__dirname, "src/main.ts"),
        },
        output: {
            path: resolve(__dirname, "app"),
            filename: "[name].js",
            chunkFilename: "[name].chunk.js",
        },
        mode: "development",
        devtool: "source-map",
        stats: "minimal",
        resolve: {
            extensions: [".ts", ".js"],
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    loader: "ts-loader",
                },
            ],
        },
        plugins: [
            new EnvironmentPlugin({
                PL_PWA_URL: `http://localhost:${process.env.PL_PWA_PORT || 8080}`,
                PL_APP_SCHEME: scheme,
                PL_APP_NAME: name,
                PL_VENDOR_VERSION: version,
                PL_TERMS_OF_SERVICE: terms_of_service,
            }),
            {
                apply(compiler) {
                    const package = JSON.stringify({
                        name,
                        description,
                        version: process.env.PL_VENDOR_VERSION || version,
                        author,
                        main: "main.js",
                    });
                    // emit is asynchronous hook, tapping into it using tapAsync, you can use tapPromise/tap(synchronous) as well
                    compiler.hooks.emit.tapPromise("InjectAppPackage", async (compilation, callback) => {
                        // Insert this list into the webpack build as a new file asset:
                        compilation.assets["package.json"] = {
                            source: () => package,
                            size: () => package.length,
                        };
                    });
                },
            },
        ],
    },
];
