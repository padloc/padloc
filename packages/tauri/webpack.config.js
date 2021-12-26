const { resolve } = require("path");
const { EnvironmentPlugin } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { version } = require("./package.json");

const out = process.env.PL_PWA_DIR || resolve(__dirname, "dist");
const serverUrl = process.env.PL_SERVER_URL || `http://0.0.0.0:${process.env.PL_SERVER_PORT || 3000}`;
const rootDir = resolve(__dirname, "../..");
const assetsDir = resolve(rootDir, process.env.PL_ASSETS_DIR || "assets");

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
                use: ["file-loader"],
            },
            {
                test: /\.txt|md$/i,
                use: "raw-loader",
            },
        ],
    },
    plugins: [
        new EnvironmentPlugin({
            PL_SERVER_URL: serverUrl,
            PL_BILLING_ENABLED: null,
            PL_BILLING_DISABLE_PAYMENT: true,
            PL_BILLING_STRIPE_PUBLIC_KEY: null,
            PL_SUPPORT_EMAIL: "support@padloc.app",
            PL_VERSION: version,
            PL_DISABLE_SW: true,
        }),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            title: "Padloc",
            template: resolve(__dirname, "src/index.html"),
        }),
    ],
    devServer: {
        contentBase: resolve(__dirname, "dist"),
        historyApiFallback: true,
        host: "0.0.0.0",
        port: process.env.PL_PWA_PORT || 8080,
    },
};
