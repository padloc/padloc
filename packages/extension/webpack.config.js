const { resolve, join } = require("path");
const { EnvironmentPlugin } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const manifest = require("./src/manifest.json");
const sharp = require("sharp");
const { version } = require("./package.json");

const serverUrl = process.env.PL_SERVER_URL || `http://0.0.0.0:${process.env.PL_SERVER_PORT || 3000}`;
const rootDir = resolve(__dirname, "../..");
const assetsDir = resolve(rootDir, process.env.PL_ASSETS_DIR || "assets");

const { name } = require(join(assetsDir, "manifest.json"));

module.exports = {
    entry: {
        popup: resolve(__dirname, "src/popup.ts"),
        background: resolve(__dirname, "src/background.ts"),
        content: resolve(__dirname, "src/content.ts"),
    },
    output: {
        path: resolve(__dirname, "dist"),
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
                test: /\.(woff|woff2|eot|ttf|otf|svg|png)$/,
                loader: "file-loader",
                options: {
                    name: "[name].[ext]",
                },
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
            PL_BILLING_ENABLED: null,
            PL_BILLING_DISABLE_PAYMENT: null,
            PL_BILLING_STRIPE_PUBLIC_KEY: null,
            PL_SUPPORT_EMAIL: "support@padloc.app",
            PL_VERSION: version,
            PL_VENDOR_VERSION: version,
            PL_DISABLE_SW: true,
        }),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            title: name,
            template: resolve(__dirname, "src/popup.html"),
            chunks: ["popup"],
            filename: "popup.html",
            meta: {
                "Content-Security-Policy": {
                    "http-equiv": "Content-Security-Policy",
                    content: `default-src 'self' ${serverUrl} blob:; style-src 'self' 'unsafe-inline'; object-src 'self' blob:; frame-src 'self'; img-src 'self' blob: data: *`,
                },
            },
        }),
        {
            apply(compiler) {
                compiler.hooks.emit.tapPromise("Web Extension Manifest", async (compilation) => {
                    const jsonString = JSON.stringify(
                        {
                            ...manifest,
                            version: `${process.env.PL_VENDOR_VERSION || version}.${process.env.RELEASE_BUILD || 0}`,
                            version_name: process.env.PL_VENDOR_VERSION || version,
                            name,
                            description: `${name} Browser Extension`,
                        },
                        null,
                        4
                    );

                    compilation.assets["manifest.json"] = {
                        source: () => jsonString,
                        size: () => jsonString.length,
                    };

                    const baseIcon = await sharp(resolve(__dirname, assetsDir, "app-icon.png")).resize({
                        width: 128,
                        height: 128,
                    });

                    const iconNormal = await baseIcon.png().toBuffer();
                    const iconGrayscale = await baseIcon.grayscale(true).png().toBuffer();

                    compilation.assets["icon.png"] = {
                        source: () => iconNormal,
                        size: () => Buffer.byteLength(iconNormal),
                    };

                    compilation.assets["icon-grayscale.png"] = {
                        source: () => iconGrayscale,
                        size: () => Buffer.byteLength(iconGrayscale),
                    };

                    return true;
                });
            },
        },
    ],
    devServer: {
        contentBase: resolve(__dirname, "dist"),
        historyApiFallback: true,
        host: "0.0.0.0",
        port: process.env.PL_EXT_PORT || 8090,
    },
};
