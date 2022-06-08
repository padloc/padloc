const { resolve, join } = require("path");
const { EnvironmentPlugin } = require("webpack");
const { InjectManifest } = require("workbox-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const WebpackPwaManifest = require("webpack-pwa-manifest");
const CspHtmlWebpackPlugin = require('@melloware/csp-webpack-plugin');
const { version } = require("../../package.json");
const sharp = require("sharp");

const out = process.env.PL_PWA_DIR || resolve(__dirname, "dist");
const serverUrl = process.env.PL_SERVER_URL || `http://0.0.0.0:${process.env.PL_SERVER_PORT || 3000}`;
const pwaUrl = process.env.PL_PWA_URL || `http://localhost:${process.env.PL_PWA_PORT || 8080}`;
const rootDir = resolve(__dirname, "../..");
const assetsDir = resolve(rootDir, process.env.PL_ASSETS_DIR || "assets");

const { name, terms_of_service } = require(join(assetsDir, "manifest.json"));

const builtFilesForCsp = [];

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
                compiler.hooks.compilation.tap('Store Built Files for CSP', (compilation) => {
                    // We tap into this hook to make sure we have the array populated before the CspHtmlWebpackPlugin runs
                    HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync('Store Built Files for CSP', (data, callback) => {
                        compilation.chunks.forEach((chunk) => {
                            builtFilesForCsp.push(...chunk.files);
                        });

                        callback(null, data);
                    });

                    return true;
                });
            }
        },
        new HtmlWebpackPlugin({
            title: name,
            template: resolve(__dirname, "src/index.html"),
            meta: {
                "Content-Security-Policy": {
                    "http-equiv": "Content-Security-Policy",
                    content: `default-src 'self' ${serverUrl};`, // NOTE: This will be overwritten below, but we need the tag to exist
                },
            },
        }),
        new CspHtmlWebpackPlugin({
            'default-src': ["'self'", serverUrl],
            'base-uri': ["'self'"],
            'script-src': ['blob:'],
            'connect-src': [serverUrl, 'https://api.pwnedpasswords.com'],
            'style-src': ["'self'", "'unsafe-inline'"],
            'object-src': ["'self'", 'blob:'],
            'frame-src': ["'self'"],
            'img-src': ["'self'", 'blob:', 'data:', 'https:'],
            'manifest-src': ["'self'"],
            'worker-src': [`${pwaUrl}/sw.js`],
            'require-trusted-types-for': ["'script'"],
        }, {
            enabled: true,
            integrityEnabled: true,
            primeReactEnabled: false,
            trustedTypesEnabled: true,
            hashingMethod: 'sha256',
            hashEnabled: {
                'script-src': true,
                'style-src': false
            },
            nonceEnabled: {
                'script-src': true,
                'style-src': false
            },
            processFn: (builtPolicy, htmlPluginData, $) => {
                const metaTag = $('meta[http-equiv="Content-Security-Policy"]');

                // builtFilesForCsp are generated only after this plugin is specified, so we need to manually add them here.
                builtPolicy = builtPolicy.replace('script-src ', `script-src ${builtFilesForCsp.map(file => `${pwaUrl}/${file}`).join(' ')} `)

                metaTag.attr('content', builtPolicy);

                htmlPluginData.html = $.html();
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
