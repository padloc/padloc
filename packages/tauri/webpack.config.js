const { resolve, join } = require("path");
const { EnvironmentPlugin, optimize } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { version } = require("./package.json");

const out = process.env.PL_PWA_DIR || resolve(__dirname, "dist");
const serverUrl = process.env.PL_SERVER_URL || `http://0.0.0.0:${process.env.PL_SERVER_PORT || 3000}`;
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
            PL_APP_NAME: name,
            PL_SERVER_URL: serverUrl,
            PL_SUPPORT_EMAIL: "support@padloc.app",
            PL_VERSION: version,
            PL_VENDOR_VERSION: version,
            PL_DISABLE_SW: true,
            PL_CLIENT_SUPPORTED_AUTH_TYPES: "email",
            PL_TERMS_OF_SERVICE: terms_of_service,
        }),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            title: name,
            template: resolve(__dirname, "src/index.html"),
        }),
        // NOTE: Right now, tauri will try to add `const __TAURI_INVOKE_KEY__ = randomNumber` to every generated JS file, which causes problems if there are chunks
        new optimize.LimitChunkCountPlugin({
            maxChunks: 1,
        }),
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
