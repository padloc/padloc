const path = require("path");
const { EnvironmentPlugin } = require("webpack");
const { InjectManifest } = require("workbox-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const WebpackPwaManifest = require("webpack-pwa-manifest");
const FaviconsWebpackPlugin = require("favicons-webpack-plugin");
const { version } = require("./package.json");

const out = process.env.PL_PWA_DIR || path.resolve(__dirname, "dist");

module.exports = {
    entry: path.resolve(__dirname, "src/index.ts"),
    output: {
        path: out,
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
                test: /\.(woff|woff2|eot|ttf|otf|svg)$/,
                use: ["file-loader"]
            }
        ]
    },
    plugins: [
        new EnvironmentPlugin({
            PL_SERVER_URL: `http://0.0.0.0:${process.env.PL_SERVER_PORT || 3000}`,
            PL_BILLING_ENABLED: null,
            PL_BILLING_DISABLE_PAYMENT: null,
            PL_BILLING_STRIPE_PUBLIC_KEY: null,
            PL_SUPPORT_EMAIL: "support@padloc.app",
            PL_VERSION: version,
            PL_DISABLE_SW: false
        }),
        new CleanWebpackPlugin(),
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
        new FaviconsWebpackPlugin(path.resolve(__dirname, "assets/icon-512.png")),
        new WebpackPwaManifest({
            name: "Padloc Password Manager",
            short_name: "Padloc",
            background_color: "#59c6ff",
            theme: "#59c6ff",
            icons: [
                {
                    src: path.resolve(__dirname, "assets/icon-512.png"),
                    sizes: [96, 128, 192, 256, 384, 512]
                }
            ]
        }),
        new InjectManifest({
            swSrc: path.resolve(__dirname, "../app/src/sw.ts"),
            swDest: "sw.js",
            exclude: [/favicon\.png$/, /\.map$/]
        })
    ],
    devServer: {
        contentBase: path.resolve(__dirname, "dist"),
        historyApiFallback: true,
        host: "0.0.0.0",
        port: process.env.PL_PWA_PORT || 8080
    }
};
