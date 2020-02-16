const path = require("path");
const { EnvironmentPlugin } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { version } = require("./package.json");
const manifest = require("./src/manifest.json");

const serverUrl = process.env.PL_SERVER_URL || `http://0.0.0.0:${process.env.PL_SERVER_PORT || 3000}`;

module.exports = {
    entry: {
        popup: path.resolve(__dirname, "src/popup.ts"),
        background: path.resolve(__dirname, "src/background.ts"),
        content: path.resolve(__dirname, "src/content.ts")
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].js",
        chunkFilename: "[name].chunk.js",
        publicPath: "/"
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
                test: /\.(woff|woff2|eot|ttf|otf|svg|png)$/,
                loader: "file-loader",
                options: {
                    name: "[name].[ext]"
                }
            }
        ]
    },
    plugins: [
        new EnvironmentPlugin({
            PL_SERVER_URL: serverUrl,
            PL_BILLING_ENABLED: null,
            PL_BILLING_DISABLE_PAYMENT: null,
            PL_BILLING_STRIPE_PUBLIC_KEY: null,
            PL_SUPPORT_EMAIL: "support@padloc.app",
            PL_VERSION: version,
            PL_DISABLE_SW: true
        }),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            title: "Padloc",
            template: path.resolve(__dirname, "src/popup.html"),
            chunks: ["popup"],
            filename: "popup.html",
            meta: {
                "Content-Security-Policy": {
                    "http-equiv": "Content-Security-Policy",
                    content: `default-src 'self' ${serverUrl} ${
                        process.env.PL_BILLING_ENABLED ? "https://*.stripe.com" : ""
                    }; style-src 'self' 'unsafe-inline'; object-src 'self' blob:; frame-src 'self' blob: ${
                        process.env.PL_BILLING_ENABLED ? "https://*.stripe.com" : ""
                    }; img-src 'self' blob:`
                }
            }
        }),
        {
            apply(compiler) {
                compiler.hooks.emit.tap("Web Extension Manifest", compilation => {
                    const jsonString = JSON.stringify(
                        {
                            ...manifest,
                            version
                        },
                        null,
                        4
                    );

                    compilation.assets["manifest.json"] = {
                        source: () => jsonString,
                        size: () => jsonString.length
                    };

                    return true;
                });
            }
        }
    ],
    devServer: {
        contentBase: path.resolve(__dirname, "dist"),
        historyApiFallback: true,
        host: "0.0.0.0",
        port: process.env.PL_EXT_PORT || 8090
    }
};
