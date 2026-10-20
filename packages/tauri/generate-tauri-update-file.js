const { resolve, join, basename } = require("path");
const { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } = require("fs");
const { createHash } = require("crypto");
const semver = require("semver");

const targets = {
    "darwin-x86_64": { label: "macos_tauri_x86_64", updater: ".app.tar.gz", installers: [".dmg"], legacy: "darwin" },
    "darwin-aarch64": { label: "macos_tauri_aarch64", updater: ".app.tar.gz", installers: [".dmg"] },
    "linux-x86_64": {
        label: "linux_tauri_amd64",
        updater: ".AppImage.tar.gz",
        installers: [".AppImage", ".deb"],
        legacy: "linux",
    },
    "windows-x86_64": { label: "windows_tauri_x64", updater: ".msi.zip", installers: [".msi"], legacy: "win64" },
};

function filesUnder(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? filesUnder(path) : [path];
    });
}

function validateSignature(signature) {
    if (
        !/^[A-Za-z0-9+/]+={0,2}$/.test(signature) ||
        !Buffer.from(signature, "base64").toString().startsWith("untrusted comment:")
    ) {
        throw new Error("Expected the contents of a Tauri .sig file, not a path or URL");
    }
}

function stage({ platform, bundleDir, outputDir, version, name, baseUrl }) {
    const target = targets[platform];
    if (!target) throw new Error(`Unsupported platform: ${platform}`);
    if (!semver.valid(version)) throw new Error(`Invalid release version: ${version}`);
    const releaseUrl = new URL(`${baseUrl.replace(/\/$/, "")}/releases/download/v${version}/`);
    if (releaseUrl.protocol !== "https:") throw new Error("Release URLs must use HTTPS");
    if (!/^[a-z0-9-]+$/i.test(name)) throw new Error("Release name must contain only letters, digits, or hyphens");
    const files = filesUnder(bundleDir);
    const exactlyOne = (suffix) => {
        const matches = files.filter((file) => file.endsWith(suffix));
        if (matches.length !== 1)
            throw new Error(`Expected exactly one ${suffix} artifact for ${platform}, found ${matches.length}`);
        return matches[0];
    };
    const archive = exactlyOne(target.updater);
    const signature = readFileSync(`${archive}.sig`, "utf8").trim();
    validateSignature(signature);
    const artifacts = [archive, `${archive}.sig`, ...target.installers.map(exactlyOne)];
    const prefix = `${name.toLowerCase()}_${version}_${target.label}`;
    // Validate every input before staging any files.
    mkdirSync(outputDir, { recursive: true });
    const checksums = [];
    for (const artifact of artifacts) {
        const suffix =
            artifact === archive
                ? target.updater
                : artifact === `${archive}.sig`
                ? `${target.updater}.sig`
                : target.installers.find((ext) => artifact.endsWith(ext));
        const filename = `${prefix}${suffix}`;
        copyFileSync(artifact, join(outputDir, filename));
        checksums.push(`${createHash("sha256").update(readFileSync(artifact)).digest("hex")}  ${filename}`);
    }
    const entry = { url: new URL(`${prefix}${target.updater}`, releaseUrl).href, signature };
    const platforms = { [platform]: entry };
    if (target.legacy) platforms[target.legacy] = entry;
    const manifest = { version, platforms };
    writeFileSync(join(outputDir, `${platform}.json`), `${JSON.stringify(manifest, null, 4)}\n`);
    writeFileSync(join(outputDir, `sha256sum-tauri-${platform}.txt`), `${checksums.join("\n")}\n`);
    return manifest;
}

function merge({ directory, output, version, notes = "", date = new Date().toISOString() }) {
    if (!semver.valid(version)) throw new Error(`Invalid release version: ${version}`);
    const platforms = {};
    for (const platform of Object.keys(targets)) {
        const part = JSON.parse(readFileSync(join(directory, `${platform}.json`), "utf8"));
        if (part.version !== version) throw new Error(`Version mismatch for ${platform}`);
        const entry = part.platforms[platform];
        if (!entry || new URL(entry.url).protocol !== "https:") throw new Error(`Invalid update URL for ${platform}`);
        validateSignature(entry.signature);
        const filename = basename(new URL(entry.url).pathname);
        if (readFileSync(join(directory, `${filename}.sig`), "utf8").trim() !== entry.signature)
            throw new Error(`Signature mismatch for ${platform}`);
        // Ensure the referenced artifact exists before publishing the feed.
        readFileSync(join(directory, filename));
        platforms[platform] = entry;
        if (targets[platform].legacy) platforms[targets[platform].legacy] = entry;
    }
    const manifest = { version, name: `v${version}`, notes, pub_date: date, platforms };
    writeFileSync(output, `${JSON.stringify(manifest, null, 4)}\n`);
    return manifest;
}

if (require.main === module) {
    require("dotenv").config();
    const [command, ...args] = process.argv.slice(2);
    const version = process.env.PL_VENDOR_VERSION || require("./package.json").version;
    if (command === "stage" && args.length === 3) {
        const assetsDir = resolve(__dirname, "../..", process.env.PL_ASSETS_DIR || "assets");
        stage({
            platform: args[0],
            bundleDir: resolve(args[1]),
            outputDir: resolve(args[2]),
            version,
            name: require(join(assetsDir, "manifest.json")).name,
            baseUrl: process.env.PL_VENDOR_BASE_URL || "https://github.com/padloc/padloc",
        });
    } else if (command === "merge" && args.length === 2) {
        merge({ directory: resolve(args[0]), output: resolve(args[1]), version });
    } else {
        throw new Error(
            "Usage: node generate-tauri-update-file.js stage <os-arch> <bundle-dir> <output-dir> | merge <artifacts-dir> <output-json>"
        );
    }
}

module.exports = { stage, merge, targets };
