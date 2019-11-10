const path = require("path");
const { EnvironmentPlugin, optimize } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { description, author, version } = require("./package.json");

module.exports = [
    {
        target: "electron-renderer",
        entry: {
            app: path.resolve(__dirname, "src/index.ts")
        },
        output: {
            path: path.resolve(__dirname, "app"),
            filename: "[name].js",
            chunkFilename: "[name].chunk.js"
        },
        mode: "development",
        devtool: "source-map",
        stats: "minimal",
        resolve: {
            extensions: [".ts", ".js"]
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    loader: "ts-loader"
                },
                {
                    test: /\.css$/,
                    use: ["style-loader", "css-loader"]
                },
                {
                    test: /\.(woff|woff2|eot|ttf|otf|svg)$/,
                    use: ["file-loader"]
                }
            ]
        },
        plugins: [
            new EnvironmentPlugin({
                PL_SERVER_URL: `http://localhost:${process.env.PL_SERVER_PORT || 3000}`,
                PL_BILLING_ENABLED: null,
                PL_BILLING_DISABLE_PAYMENT: null,
                PL_BILLING_STRIPE_PUBLIC_KEY: null,
                PL_SUPPORT_EMAIL: "support@padloc.app",
                PL_VERSION: version,
                PL_DISABLE_SW: true
            }),
            new HtmlWebpackPlugin({
                title: "Padloc",
                template: path.resolve(__dirname, "src/index.html"),
                meta: {
                    "Content-Security-Policy": {
                        "http-equiv": "Content-Security-Policy",
                        content: `default-src 'self' ${process.env.PL_SERVER_URL} ${
                            process.env.PL_BILLING_ENABLED ? "https://*.stripe.com" : ""
                        }; style-src 'self' 'unsafe-inline'; object-src 'self' blob:; frame-src 'self' blob: ${
                            process.env.PL_BILLING_ENABLED ? "https://*.stripe.com" : ""
                        }; img-src 'self' blob:`
                    }
                }
            }),
            new optimize.LimitChunkCountPlugin({
                maxChunks: 1
            })
        ]
    },
    {
        target: "electron-main",
        entry: {
            main: path.resolve(__dirname, "src/main.ts")
        },
        output: {
            path: path.resolve(__dirname, "app"),
            filename: "[name].js",
            chunkFilename: "[name].chunk.js"
        },
        mode: "development",
        devtool: "source-map",
        stats: "minimal",
        resolve: {
            extensions: [".ts", ".js"]
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    loader: "ts-loader"
                }
            ]
        },
        plugins: [
            new EnvironmentPlugin({
                PL_SERVER_URL: `http://localhost:${process.env.PL_SERVER_PORT || 3000}`,
                PL_STRIPE_PUBLIC_KEY: null
            }),
            {
                apply(compiler) {
                    const package = JSON.stringify({ name: "Padloc", author, description, version, main: "main.js" });
                    // emit is asynchronous hook, tapping into it using tapAsync, you can use tapPromise/tap(synchronous) as well
                    compiler.hooks.emit.tapAsync("InjectAppPackage", (compilation, callback) => {
                        // Insert this list into the webpack build as a new file asset:
                        compilation.assets["package.json"] = {
                            source: () => package,
                            size: () => package.length
                        };

                        callback();
                    });
                }
            }
        ]
    }
];
