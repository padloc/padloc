import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, extname, join, relative, resolve } from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { version } from "../../package.json";

const packageDir = dirname(fileURLToPath(import.meta.url));
const sourceDir = resolve(packageDir, "src");
const rootDir = resolve(packageDir, "../..");
const assetsDir = resolve(rootDir, process.env.PL_ASSETS_DIR || "assets");
const outDir = resolve(packageDir, process.env.PL_PWA_DIR || "dist");

function removeTrailingSlash(url: string) {
    return url.replace(/(\/*)$/, "");
}

function websocketOriginFor(url: string, fallbackPort: number) {
    try {
        const parsed = new URL(url);
        return `${parsed.protocol === "https:" ? "wss:" : "ws:"}//${parsed.host}`;
    } catch (_e) {
        return `ws://localhost:${fallbackPort}`;
    }
}

function listFiles(dir: string, base = dir): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        return entry.isDirectory() ? listFiles(path, base) : [relative(base, path).replace(/\\/g, "/")];
    });
}

function padlocAssetsPlugin(): Plugin {
    return {
        name: "padloc-assets",
        async closeBundle() {
            const iconPath = resolve(assetsDir, "app-icon.png");
            mkdirSync(outDir, { recursive: true });
            copyFileSync(iconPath, resolve(outDir, "app-icon.png"));

            const favicon = await sharp(iconPath).resize({ width: 256, height: 256 }).toBuffer();
            writeFileSync(resolve(outDir, "favicon.png"), favicon);
        },
    };
}

function padlocCspPlugin(pwaUrl: string, serverUrl: string, disableCsp: boolean): Plugin {
    return {
        name: "padloc-csp",
        transformIndexHtml(html, context) {
            if (disableCsp) {
                return html;
            }

            let content = `default-src 'none'; base-uri 'none'; script-src blob: [REPLACE_SCRIPT]; connect-src ${serverUrl} https://api.pwnedpasswords.com [REPLACE_CONNECT]; style-src 'unsafe-inline' [REPLACE_STYLE]; font-src [REPLACE_FONT]; object-src blob:; frame-src blob:; img-src [REPLACE_IMG] blob: data: https://icons.duckduckgo.com; manifest-src [REPLACE_MANIFEST]; worker-src ${pwaUrl}/sw.js;`;

            if (context.server) {
                const devServerUrl = `${pwaUrl}/`;
                const devWebsocketUrl = websocketOriginFor(pwaUrl, Number(process.env.PL_PWA_PORT || 8080));
                content = content
                    .replace("[REPLACE_SCRIPT]", devServerUrl)
                    .replace("[REPLACE_CONNECT]", `${devWebsocketUrl} ${devServerUrl}`)
                    .replace("[REPLACE_STYLE]", devServerUrl)
                    .replace("[REPLACE_FONT]", devServerUrl)
                    .replace("[REPLACE_IMG]", devServerUrl)
                    .replace("[REPLACE_MANIFEST]", devServerUrl);
            }

            return html.replace(
                "</head>",
                `        <meta http-equiv="Content-Security-Policy" content="${content}" />\n    </head>`
            );
        },
        closeBundle() {
            if (disableCsp) {
                return;
            }

            const htmlFilePath = resolve(outDir, "index.html");
            let html = readFileSync(htmlFilePath, "utf-8");
            const filesByRule = new Map<string, string[]>([
                ["script-src", []],
                ["style-src", []],
                ["font-src", []],
                ["img-src", []],
                ["manifest-src", []],
            ]);
            const extensionToRule = new Map([
                [".css", "style-src"],
                [".js", "script-src"],
                [".json", "manifest-src"],
                [".webmanifest", "manifest-src"],
                [".png", "img-src"],
                [".svg", "img-src"],
                [".woff2", "font-src"],
            ]);

            for (const file of listFiles(outDir)) {
                if (file === "index.html" || file === "sw.js" || file.endsWith(".map")) {
                    continue;
                }

                const rule = extensionToRule.get(extname(file));
                if (rule) {
                    filesByRule.get(rule)!.push(file);
                }
            }

            for (const icon of ["favicon.png", "app-icon.png"]) {
                if (!filesByRule.get("img-src")!.includes(icon)) {
                    filesByRule.get("img-src")!.push(icon);
                }
            }

            for (const [rule, files] of filesByRule) {
                files.sort();
                html = html.replace(
                    `[REPLACE_${rule.replace("-src", "").toUpperCase()}]`,
                    files.map((file) => `${pwaUrl}/${file}`).join(" ")
                );
            }

            html = html.replace("[REPLACE_CONNECT]", pwaUrl.startsWith("http://localhost") ? pwaUrl : "");
            writeFileSync(htmlFilePath, html, "utf-8");
        },
    };
}

const manifest = JSON.parse(readFileSync(resolve(assetsDir, "manifest.json"), "utf-8"));
const serverUrl = removeTrailingSlash(
    process.env.PL_SERVER_URL || `http://0.0.0.0:${process.env.PL_SERVER_PORT || 3000}`
);
const pwaUrl = removeTrailingSlash(process.env.PL_PWA_URL || `http://localhost:${process.env.PL_PWA_PORT || 8080}`);
const disableCsp = process.env.PL_PWA_DISABLE_CSP === "true";

export default defineConfig({
    root: sourceDir,
    base: "/",
    resolve: {
        alias: {
            assets: assetsDir,
        },
    },
    define: {
        "process.env": JSON.stringify({
            PL_APP_NAME: manifest.name,
            PL_PWA_URL: pwaUrl,
            PL_SERVER_URL: serverUrl,
            PL_BILLING_ENABLED: null,
            PL_BILLING_DISABLE_PAYMENT: null,
            PL_BILLING_STRIPE_PUBLIC_KEY: null,
            PL_SUPPORT_EMAIL: "support@padloc.app",
            PL_VERSION: version,
            PL_VENDOR_VERSION: version,
            PL_DISABLE_SW: process.env.PL_DISABLE_SW === "true",
            PL_CLIENT_SUPPORTED_AUTH_TYPES: "email",
            PL_TERMS_OF_SERVICE: manifest.terms_of_service,
        }),
    },
    build: {
        outDir,
        emptyOutDir: true,
        sourcemap: false,
    },
    server: {
        host: "0.0.0.0",
        port: Number(process.env.PL_PWA_PORT || 8080),
    },
    plugins: [
        padlocAssetsPlugin(),
        VitePWA({
            strategies: "injectManifest",
            injectRegister: null,
            srcDir: "../../app/src",
            filename: "sw.ts",
            injectManifest: {
                rollupFormat: "iife",
                globIgnores: ["**/favicon.png", "**/*.map"],
            },
            manifest: {
                name: manifest.name,
                short_name: manifest.name,
                icons: [{ src: "/app-icon.png", sizes: "512x512", type: "image/png" }],
            },
        }),
        padlocCspPlugin(pwaUrl, serverUrl, disableCsp),
    ],
});
