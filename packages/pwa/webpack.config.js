const { resolve, join } = require("path");
const { EnvironmentPlugin } = require("webpack");
const { InjectManifest } = require("workbox-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const WebpackPwaManifest = require("webpack-pwa-manifest");
const { version } = require("../../package.json");
const sharp = require("sharp");

const out = process.env.PL_PWA_DIR || resolve(__dirname, "dist");
const serverUrl = process.env.PL_SERVER_URL || `http://0.0.0.0:${process.env.PL_SERVER_PORT || 3000}`;
const pwaUrl = process.env.PL_PWA_URL || `http://localhost:${process.env.PL_PWA_PORT || 8080}`;
const rootDir = resolve(__dirname, "../..");
const assetsDir = resolve(rootDir, process.env.PL_ASSETS_DIR || "assets");

const { name, terms_of_service } = require(join(assetsDir, "manifest.json"));

module.exports = {
    entry: resolve(__dirname, "src/index.ts"),
    output: {
        path: out,
        filename: "[name].js",
        chunkFilename: "[name].chunk.js",
        publicPath: "/",
    },
    mode: "development",
    devtool: "source-map",
    stats: "minimal",
    resolve: {
        extensions: [".ts", ".js", ".css", ".svg", ".png", ".jpg"],
        alias: {
            assets: assetsDir,
        },
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: "ts-loader",
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf|svg)$/,
                use: [
                    {
                        loader: "file-loader",
                        options: {
                            name: '[name].[ext]',
                        }
                    },
                ],
            },
            {
                test: /\.txt|md$/i,
                use: "raw-loader",
            },
        ],
    },
    plugins: [
        new EnvironmentPlugin({
            PL_APP_NAME: name,
            PL_PWA_URL: pwaUrl,
            PL_SERVER_URL: serverUrl,
            PL_BILLING_ENABLED: null,
            PL_BILLING_DISABLE_PAYMENT: null,
            PL_BILLING_STRIPE_PUBLIC_KEY: null,
            PL_SUPPORT_EMAIL: "support@padloc.app",
            PL_VERSION: version,
            PL_VENDOR_VERSION: version,
            PL_DISABLE_SW: false,
            PL_CLIENT_SUPPORTED_AUTH_TYPES: "email",
            PL_TERMS_OF_SERVICE: terms_of_service,
        }),
        new CleanWebpackPlugin(),
        {
            apply(compiler) {
                compiler.hooks.compilation.tap("Store Built Files for CSP", (compilation) => {
                    HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(
                        "Store Built Files for CSP",
                        (data, callback) => {
                            const isBuildingLocally = pwaUrl.startsWith("http://localhost");
                            const fileExtensionsToCspRule = new Map([
                                ["js", "script-src"],
                                ["map", "script-src"],
                                ["woff2", "font-src"],
                                ["svg", "img-src"],
                                ["png", "img-src"],
                            ]);
                            const builtFilesForCsp = new Map([
                                ["script-src", []],
                                ["font-src", []],
                                [
                                    "img-src",
                                    [
                                        "favicon.png",
                                        // TODO: These should be dynamically added (from the manifest), but it's not available at this point
                                        "icon_512x512.e3175643e8fe0d95175a493da5201480.png",
                                        "icon_384x384.971e45062e4d601a3014dc16ee3ed27b.png",
                                        "icon_256x256.9a47fba2857d94939047064f37cd075f.png",
                                        "icon_192x192.8dfb7236c7e6b6591567173b18eaa144.png",
                                        "icon_128x128.f620784d1682c9fbb033d3b018e7d998.png",
                                        "icon_96x96.eda9f98be1c35dabab77f9d2ab7be538.png",
                                    ],
                                ],
                                // TODO: This should to be dynamically added, but it's not available at this point
                                ["manifest-src", ["manifest.623e2268f17398ec7f19225e281e4056.json"]],
                            ]);

                            // Add the root PWA URL of webpack-dev-server to script-src when building locally, otherwise server hot reloading won't work
                            if (isBuildingLocally) {
                                builtFilesForCsp.get("script-src").push("");
                            }

                            const assets = compilation.getAssets();

                            for (const asset of assets) {
                                const fileExtension = asset.name.split(".").pop();

                                if (!fileExtensionsToCspRule.has(fileExtension)) {
                                    throw new Error(`No CSP rule found for ".${fileExtension}"! (${asset.name})`);
                                }

                                const cspRule = fileExtensionsToCspRule.get(fileExtension);

                                if (!builtFilesForCsp.has(cspRule)) {
                                    throw new Error(`No CSP rule found for "${cspRule}"! (${fileExtension})`);
                                }

                                builtFilesForCsp.get(cspRule).push(asset.name);
                            }

                            // Manually add the files in for the CSP meta tag
                            for (const cspRule of builtFilesForCsp.keys()) {
                                data.html = data.html.replace(
                                    `[REPLACE_${cspRule.replace("-src", "").toUpperCase()}]`,
                                    `${builtFilesForCsp
                                        .get(cspRule)
                                        .map((file) => `${pwaUrl}/${file}`)
                                        .join(" ")}`
                                );
                            }

                            // Add the websocket URL + PWA URL of webpack-dev-server to connect-src when building locally, or nothing otherwise
                            let connectReplacement = isBuildingLocally
                                ? `ws://localhost:${process.env.PL_PWA_PORT || 8080}/ws ${pwaUrl}`
                                : "";
                            data.html = data.html.replace("[REPLACE_CONNECT]", connectReplacement);

                            callback(null, data);
                        }
                    );

                    return true;
                });
            },
        },
        new HtmlWebpackPlugin({
            title: name,
            template: resolve(__dirname, "src/index.html"),
            meta: {
                "Content-Security-Policy": {
                    "http-equiv": "Content-Security-Policy",
                    content: `default-src 'none'; base-uri 'none'; script-src blob: [REPLACE_SCRIPT]; connect-src ${serverUrl} https://api.pwnedpasswords.com [REPLACE_CONNECT]; style-src 'unsafe-inline'; font-src [REPLACE_FONT]; object-src blob:; frame-src 'none'; img-src [REPLACE_IMG] blob: data: https://icons.duckduckgo.com; manifest-src [REPLACE_MANIFEST]; worker-src ${pwaUrl}/sw.js;`,
                },
            },
        }),
        new WebpackPwaManifest({
            name: name,
            short_name: name,
            icons: [
                {
                    src: resolve(__dirname, assetsDir, "app-icon.png"),
                    sizes: [96, 128, 192, 256, 384, 512],
                },
            ],
        }),
        new InjectManifest({
            swSrc: resolve(__dirname, "../app/src/sw.ts"),
            swDest: "sw.js",
            exclude: [/favicon\.png$/, /\.map$/],
        }),
        {
            apply(compiler) {
                compiler.hooks.emit.tapPromise("Generate Favicon", async (compilation) => {
                    const icon = await sharp(resolve(__dirname, assetsDir, "app-icon.png"))
                        .resize({
                            width: 256,
                            height: 256,
                        })
                        .toBuffer();

                    compilation.assets["favicon.png"] = {
                        source: () => icon,
                        size: () => Buffer.byteLength(icon),
                    };

                    return true;
                });
            },
        },
    ],
    devServer: {
        historyApiFallback: true,
        host: "0.0.0.0",
        port: process.env.PL_PWA_PORT || 8080,
        // hot: false,
        // liveReload: false,
        client: { overlay: false },
    },
};
