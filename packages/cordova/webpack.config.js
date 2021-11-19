const { resolve, join } = require("path");
const { EnvironmentPlugin, optimize } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { version } = require("./package.json");
const sharp = require("sharp");

const rootDir = resolve(__dirname, "../..");
const assetsDir = resolve(rootDir, process.env.PL_ASSETS_DIR || "assets");

const { icon_background, version: vendorVersion } = require(join(assetsDir, "manifest.json"));

module.exports = {
    entry: resolve(__dirname, "src/index.ts"),
    output: {
        path: resolve(__dirname, "www"),
        filename: "[name].js",
        chunkFilename: "[name].chunk.js",
    },
    mode: "development",
    devtool: "source-map",
    stats: "minimal",
    resolve: {
        extensions: [".ts", ".js", ".css", ".svg", ".png", ".jpg"],
        alias: {
            assets: resolve(__dirname, assetsDir),
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
    externals: {
        cordova: "cordova",
        "cordova-plugin-qrscanner": "window",
    },
    plugins: [
        new EnvironmentPlugin({
            PL_SERVER_URL: `http://localhost:${process.env.PL_SERVER_PORT || 3000}`,
            PL_BILLING_ENABLED: null,
            PL_BILLING_DISABLE_PAYMENT: null,
            PL_BILLING_STRIPE_PUBLIC_KEY: null,
            PL_SUPPORT_EMAIL: "support@padloc.app",
            PL_VERSION: version,
            PL_VENDOR_VERSION: vendorVersion || version,
            PL_DISABLE_SW: true,
            PL_AUTH_DEFAULT_TYPE: null,
        }),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            title: "Padloc",
            template: resolve(__dirname, "src/index.html"),
            meta: {
                "Content-Security-Policy": {
                    "http-equiv": "Content-Security-Policy",
                    content: `default-src 'self' ${process.env.PL_SERVER_URL}; style-src 'self' 'unsafe-inline'; object-src 'self' blob:; frame-src 'self' blob:; img-src 'self' blob:`,
                },
            },
        }),
        new optimize.LimitChunkCountPlugin({
            maxChunks: 1,
        }),
        {
            apply(compiler) {
                compiler.hooks.emit.tapPromise("Prepare App Icons", async (compilation) => {
                    const iconPath = join(assetsDir, "app-icon.png");
                    const { width } = await sharp(iconPath).metadata();
                    const iosPadding = Math.floor(width / 10);
                    const androidPadding = Math.floor(width * 0.5);
                    const iosIcon = await sharp(iconPath)
                        .flatten({ background: icon_background })
                        .extend({
                            top: iosPadding,
                            right: iosPadding,
                            bottom: iosPadding,
                            left: iosPadding,
                            background: icon_background,
                        })
                        .toBuffer();

                    const androidIcon = await sharp(iconPath)
                        .extend({
                            top: androidPadding,
                            right: androidPadding,
                            bottom: androidPadding,
                            left: androidPadding,
                            background: { r: 0, b: 0, g: 0, alpha: 0 },
                        })
                        .toBuffer();

                    const iosIconSizes = [
                        20,
                        29,
                        40,
                        50,
                        57,
                        58,
                        60,
                        72,
                        76,
                        80,
                        87,
                        100,
                        114,
                        120,
                        144,
                        152,
                        167,
                        180,
                    ];

                    const androidIconSizes = [36, 48, 72, 96, 144, 192];

                    await Promise.all([
                        ...iosIconSizes.map(async (size) => {
                            const icon = await sharp(iosIcon)
                                .resize({
                                    width: size,
                                    height: size,
                                })
                                .png({ quality: 100 })
                                .toBuffer();

                            compilation.assets[`res/icons/ios/app-icon-${size}.png`] = {
                                source: () => icon,
                                size: () => Buffer.byteLength(icon),
                            };
                        }),
                        ...androidIconSizes.map(async (size) => {
                            const icon = await sharp(androidIcon)
                                .resize({
                                    width: size,
                                    height: size,
                                })
                                .png({ quality: 100 })
                                .toBuffer();

                            compilation.assets[`res/icons/android/app-icon-${size}.png`] = {
                                source: () => icon,
                                size: () => Buffer.byteLength(icon),
                            };
                        }),
                    ]);

                    const storeIcon = await sharp(iosIcon)
                        .resize({
                            width: 1024,
                            height: 1024,
                        })
                        .jpeg({ quality: 100 })
                        .toBuffer();

                    compilation.assets[`res/icons/ios/app-icon-1024.jpg`] = {
                        source: () => storeIcon,
                        size: () => Buffer.byteLength(storeIcon),
                    };

                    const colors = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="background">${icon_background}</color>
</resources>`;
                    compilation.assets["res/icons/android/colors.xml"] = {
                        source: () => colors,
                        size: () => colors.length,
                    };

                    return true;
                });
            },
        },
    ],
};
