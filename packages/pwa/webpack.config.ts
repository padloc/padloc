import { resolve, join } from "path";
import { readFileSync, writeFileSync } from "fs";
import { EnvironmentPlugin, Configuration, WebpackPluginInstance } from "webpack";
import "webpack-dev-server";
import { InjectManifest } from "workbox-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import WebpackPwaManifest from "webpack-pwa-manifest";
import sharp from "sharp";
import { version } from "../../package.json";
import { Compiler } from "webpack";

function removeTrailingSlash(url: string) {
    return url.replace(/(\/*)$/, "");
}

const outDir = process.env.PL_PWA_DIR || resolve(__dirname, "dist");
const serverUrl = removeTrailingSlash(
    process.env.PL_SERVER_URL || `http://0.0.0.0:${process.env.PL_SERVER_PORT || 3000}`
);
const pwaUrl = removeTrailingSlash(process.env.PL_PWA_URL || `http://localhost:${process.env.PL_PWA_PORT || 8080}`);
const rootDir = resolve(__dirname, "../..");
const assetsDir = resolve(rootDir, process.env.PL_ASSETS_DIR || "assets");
const disableCsp = process.env.PL_PWA_DISABLE_CSP === "true";

const { name, terms_of_service } = require(join(assetsDir, "manifest.json"));

const isBuildingLocally = pwaUrl.startsWith("http://localhost");

const htmlMetaTags = disableCsp
    ? false
    : {
          "Content-Security-Policy": {
              "http-equiv": "Content-Security-Policy",
              content: `default-src 'none'; base-uri 'none'; script-src blob: [REPLACE_SCRIPT]; connect-src ${serverUrl} https://api.pwnedpasswords.com [REPLACE_CONNECT]; style-src 'unsafe-inline'; font-src [REPLACE_FONT]; object-src blob:; frame-src blob:; img-src [REPLACE_IMG] blob: data: https://icons.duckduckgo.com; manifest-src [REPLACE_MANIFEST]; worker-src ${pwaUrl}/sw.js;`,
          },
      };

export class FaviconWebpackPlugin implements WebpackPluginInstance {
    constructor(public config: { iconPath: string }) {}

    apply(compiler: Compiler) {
        compiler.hooks.emit.tapPromise("Generate Favicon", async (compilation) => {
            const icon = await sharp(this.config.iconPath)
                .resize({
                    width: 256,
                    height: 256,
                })
                .toBuffer();

            compilation.assets["favicon.png"] = {
                source: () => icon,
                size: () => Buffer.byteLength(icon),
            } as any;
        });
    }
}

export class CSPWebpackPlugin implements WebpackPluginInstance {
    constructor(public config: { outDir: string; enabled: boolean; mode?: "development" | "production" }) {}

    apply(compiler: Compiler) {
        return this.config.mode === "production" ? this._applyProd(compiler) : this._applyDev(compiler);
    }

    private _applyDev(compiler: Compiler) {
        if (disableCsp) {
            return;
        }

        compiler.hooks.compilation.tap("Update CSP - dev", (compilation) => {
            HtmlWebpackPlugin.getHooks(compilation as any).beforeEmit.tapAsync("Update CSP - dev", (data, callback) => {
                if (!isBuildingLocally) {
                    callback(null, data);
                    return;
                }

                const builtFilesForCsp = new Map([
                    ["script-src", [""]],
                    ["font-src", [""]],
                    ["img-src", [""]],
                    ["manifest-src", [""]],
                ]);

                // Manually add the root for the CSP meta tag
                for (const cspRule of builtFilesForCsp.keys()) {
                    const files = builtFilesForCsp.get(cspRule);

                    data.html = data.html.replace(
                        `[REPLACE_${cspRule.replace("-src", "").toUpperCase()}]`,
                        `${files?.map((file) => `${pwaUrl}/${file}`).join(" ")}`
                    );
                }

                // Add the websocket URL + PWA URL of webpack-dev-server to connect-src when building locally, or nothing otherwise
                const connectReplacement = `ws://localhost:${process.env.PL_PWA_PORT || 8080}/ws ${pwaUrl}`;
                data.html = data.html.replace("[REPLACE_CONNECT]", connectReplacement);

                callback(null, data);
            });

            return true;
        });
    }

    private _applyProd(compiler: Compiler) {
        if (!this.config.enabled) {
            return;
        }

        compiler.hooks.afterEmit.tapPromise("Store Built Files for CSP - non-dev", async (compilation) => {
            if (isBuildingLocally) {
                // Skip
                return;
            }

            const fileExtensionsToCspRule = new Map<string, string>([
                ["js", "script-src"],
                ["map", "script-src"],
                ["woff2", "font-src"],
                ["svg", "img-src"],
                ["png", "img-src"],
                ["json", "manifest-src"],
            ]);
            const builtFilesForCsp = new Map<string, string[]>([
                ["script-src", []],
                ["font-src", []],
                ["img-src", []],
                ["manifest-src", []],
            ]);

            const assets = compilation.getAssets();

            const htmlFilePath = resolve(this.config.outDir, "index.html");
            let htmlFileContents = readFileSync(htmlFilePath, "utf-8");

            for (const asset of assets) {
                // Skip the file we're writing to!
                if (asset.name === "index.html") {
                    continue;
                }

                const fileExtension = asset.name.split(".").pop() || "";

                if (!fileExtensionsToCspRule.has(fileExtension)) {
                    // NOTE: Throwing an error in this hook is silently ignored, so we need to just log it and keep going
                    console.error(`No CSP rule found for ".${fileExtension}"! (${asset.name})`);
                    continue;
                }

                const cspRule = fileExtensionsToCspRule.get(fileExtension) || "";

                if (!builtFilesForCsp.has(cspRule)) {
                    // NOTE: Throwing an error in this hook is silently ignored, so we need to just log it and keep going
                    console.error(`No CSP rule found for "${cspRule}"! (${fileExtension})`);
                    continue;
                }

                builtFilesForCsp.get(cspRule)?.push(asset.name);
            }

            // Manually add the files in for the CSP meta tag
            for (const cspRule of builtFilesForCsp.keys()) {
                // Sort all files first
                const files = builtFilesForCsp.get(cspRule) || [];
                files.sort();

                htmlFileContents = htmlFileContents.replace(
                    `[REPLACE_${cspRule.replace("-src", "").toUpperCase()}]`,
                    `${files.map((file) => `${pwaUrl}/${file}`).join(" ")}`
                );
            }

            // Nothing more to connect to, in non-dev
            htmlFileContents = htmlFileContents.replace("[REPLACE_CONNECT]", "");

            writeFileSync(htmlFilePath, htmlFileContents, "utf-8");
        });
    }
}

export default {
    entry: resolve(__dirname, "src/index.ts"),
    output: {
        path: outDir,
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
        new CSPWebpackPlugin({
            enabled: !disableCsp,
            mode: isBuildingLocally ? "development" : "production",
            outDir,
        }),
        new HtmlWebpackPlugin({
            title: name,
            template: resolve(__dirname, "src/index.html"),
            meta: htmlMetaTags,
        }),
        new WebpackPwaManifest({
            name,
            short_name: name,
            icons: [
                {
                    src: resolve(__dirname, assetsDir, "app-icon.png"),
                    sizes: [96, 128, 192, 256, 384, 512],
                },
            ],
        }) as any,
        new InjectManifest({
            swSrc: resolve(__dirname, "../app/src/sw.ts"),
            swDest: "sw.js",
            exclude: [/favicon\.png$/, /\.map$/],
        }),
        new FaviconWebpackPlugin({
            iconPath: resolve(__dirname, assetsDir, "app-icon.png"),
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
} as Configuration;
