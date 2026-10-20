const assert = require("assert");
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } = require("fs");
const { tmpdir } = require("os");
const { join } = require("path");
const { stage, merge, targets } = require("../generate-tauri-update-file");

const root = mkdtempSync(join(tmpdir(), "padloc-release-test-"));
const outputDir = join(root, "artifacts");
const signature = Buffer.from("untrusted comment: test fixture\nnot-a-real-signature\n").toString("base64");
const version = "4.4.0-beta.1";
const output = join(root, "tauri-update.json");
const opts = { version, name: "Padloc", baseUrl: "https://github.com/padloc/padloc", outputDir };
try {
    for (const [platform, target] of Object.entries(targets)) {
        const bundleDir = join(root, platform);
        mkdirSync(bundleDir);
        writeFileSync(join(bundleDir, `Padloc${target.updater}`), `signed artifact ${platform}`);
        writeFileSync(join(bundleDir, `Padloc${target.updater}.sig`), `${signature}\n`);
        for (const ext of target.installers) writeFileSync(join(bundleDir, `Padloc${ext}`), `installer ${ext}`);
        stage({ ...opts, platform, bundleDir });
    }
    const manifest = merge({ directory: outputDir, output, version, date: "2026-10-19T00:00:00Z" });
    assert.strictEqual(manifest.version, version);
    assert.strictEqual(manifest.name, `v${version}`);
    assert.strictEqual(Object.keys(manifest.platforms).length, 7);
    for (const platform of Object.keys(targets)) {
        assert.strictEqual(manifest.platforms[platform].signature, signature);
        assert(manifest.platforms[platform].url.includes(`/v${version}/padloc_${version}_`));
    }
    assert.deepStrictEqual(manifest.platforms.darwin, manifest.platforms["darwin-x86_64"]);
    assert.deepStrictEqual(manifest.platforms.linux, manifest.platforms["linux-x86_64"]);
    assert.deepStrictEqual(manifest.platforms.win64, manifest.platforms["windows-x86_64"]);
    assert(manifest.platforms["windows-x86_64"].url.endsWith(".msi.zip"));
    assert(manifest.platforms["linux-x86_64"].url.endsWith(".AppImage.tar.gz"));
    const checksums = readFileSync(join(outputDir, "sha256sum-tauri-darwin-aarch64.txt"), "utf8");
    assert(checksums.includes("macos_tauri_aarch64.app.tar.gz"));
    assert.throws(() => merge({ directory: outputDir, output, version: "9.0.0" }), /Version mismatch/);
    assert.throws(() => merge({ directory: outputDir, output, version: "not-semver" }), /Invalid release version/);
    const bundleDir = join(root, "darwin-x86_64");
    assert.throws(() => stage({ ...opts, platform: "invalid", bundleDir }), /Unsupported platform/);
    assert.throws(
        () => stage({ ...opts, platform: "darwin-x86_64", bundleDir, baseUrl: "http://example.com" }),
        /HTTPS/
    );
    writeFileSync(join(bundleDir, "Padloc.app.tar.gz.sig"), "https://example.com/update.sig");
    assert.throws(() => stage({ ...opts, platform: "darwin-x86_64", bundleDir }), /contents of a Tauri/);
    writeFileSync(join(bundleDir, "Padloc.app.tar.gz.sig"), signature);
    writeFileSync(join(bundleDir, "Stale.app.tar.gz"), "stale build");
    assert.throws(() => stage({ ...opts, platform: "darwin-x86_64", bundleDir }), /exactly one/);
    rmSync(join(outputDir, "windows-x86_64.json"));
    const missingOutput = join(root, "incomplete.json");
    assert.throws(() => merge({ directory: outputDir, output: missingOutput, version }), /ENOENT/);
    assert(!readdirSync(root).includes("incomplete.json"), "Incomplete feeds must never be written");
    console.log("Release manifest tests passed (four platforms, legacy aliases, signatures, and failure cases).");
} finally {
    rmSync(root, { recursive: true, force: true });
}
