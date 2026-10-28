const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { run } = require("@tauri-apps/cli");
require("dotenv").config();

const root = path.resolve(__dirname, "../../..");
const assets = path.resolve(root, process.env.PL_ASSETS_DIR || "assets");
const source = path.join(assets, "app-icon.png");
const output = path.resolve(__dirname, "../src-tauri/icons");
const escape = (value) =>
    String(value).replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c])
    );

async function main() {
    const png = fs.readFileSync(source);
    if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
        throw new Error("Expected a PNG app icon.");
    const width = png.readUInt32BE(16),
        height = png.readUInt32BE(20);
    if (!width || width !== height) throw new Error("Expected a square app icon.");
    // Match Cordova's iOS treatment: flatten onto icon_background, then add
    // floor(sourceWidth / 10) on every side before resizing to native sizes.
    const padding = Math.floor(width / 10),
        size = width + 2 * padding;
    const { icon_background: background } = JSON.parse(fs.readFileSync(path.join(assets, "manifest.json"), "utf8"));
    if (!background) throw new Error("Missing icon_background in the assets manifest.");
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "padloc-ios-icons-"));
    try {
        await run(["icon", source, "--output", output]);
        const padded = path.join(temporary, "ios.svg");
        // Tauri's SVG renderer decodes the embedded PNG; no native image module
        // or extra dependency is needed just to add the background and padding.
        fs.writeFileSync(
            padded,
            `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${escape(
                background
            )}"/><image x="${padding}" y="${padding}" width="${width}" height="${height}" xlink:href="data:image/png;base64,${png.toString(
                "base64"
            )}"/></svg>`
        );
        const generated = path.join(temporary, "icons");
        await run(["icon", padded, "--output", generated, "--ios-color", background]);
        fs.cpSync(path.join(generated, "ios"), path.join(output, "ios"), { recursive: true });
        // The CLI also maintains a copy in an initialized Xcode project.
        // Its first (un-padded) pass above updates that catalog independently
        // of --output; keep those actual build inputs in sync as well.
        const catalog = path.resolve(__dirname, "../src-tauri/gen/apple/Assets.xcassets/AppIcon.appiconset");
        if (fs.existsSync(catalog)) fs.cpSync(path.join(generated, "ios"), catalog, { recursive: true });
    } finally {
        fs.rmSync(temporary, { recursive: true, force: true });
    }
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
