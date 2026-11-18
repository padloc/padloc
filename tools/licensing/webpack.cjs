const fs = require("node:fs");
const path = require("node:path");
const { sourceInfo } = require("./source.cjs");
const { root, noticeName, packageForFile, notices } = require("./notices.cjs");

const noticeAsset = /^(?:LICENSE(?:-AGPL|-ENTERPRISE)?\.txt|THIRD-PARTY-NOTICES\.txt|SOURCE\.json|licenses\.html)$/;
const escapeHtml = (value) =>
    String(value).replace(
        /[&<>"']/g,
        (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])
    );

class LicensePlugin {
    constructor({ enterprise = false } = {}) {
        this.enterprise = enterprise;
    }
    apply(compiler) {
        const { Compilation, sources, DefinePlugin } = compiler.webpack;
        new DefinePlugin({
            "process.env.PL_SOURCE_URL": DefinePlugin.runtimeValue(() => {
                const { revision, sourceUrl } = sourceInfo();
                return JSON.stringify(
                    process.env.PL_SOURCE_URL ||
                        (revision ? `https://github.com/padloc/padloc/tree/${revision}` : sourceUrl)
                );
            }, true),
        }).apply(compiler);
        compiler.hooks.thisCompilation.tap("Padloc licenses", (compilation) => {
            const licenseFiles = this.enterprise
                ? ["LICENSE.txt", "LICENSE-AGPL.txt", "LICENSE-ENTERPRISE.txt"]
                : ["LICENSE-AGPL.txt"];
            for (const name of [...licenseFiles, noticeName]) compilation.fileDependencies.add(path.join(root, name));
            compilation.hooks.processAssets.tap(
                { name: "Padloc licenses", stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE },
                () => {
                    const packages = [];
                    const visit = (module) => {
                        const pkg = packageForFile(module.resource);
                        if (pkg) packages.push(pkg);
                        if (module.modules) for (const child of module.modules) visit(child);
                    };
                    for (const module of compilation.modules) visit(module);
                    const emit = (name, data) => compilation.emitAsset(name, new sources.RawSource(data));
                    for (const name of licenseFiles) emit(name, fs.readFileSync(path.join(root, name)));
                    emit(noticeName, notices(packages));
                    const { revision, modified, sourceUrl } = sourceInfo();
                    emit(
                        "SOURCE.json",
                        JSON.stringify(
                            {
                                revision,
                                modified,
                                sourceUrl,
                                edition: this.enterprise ? "enterprise" : "community",
                                sharedComponents: ["packages/app", "packages/core", "packages/locale"],
                            },
                            null,
                            4
                        ) + "\n"
                    );
                    emit(
                        "licenses.html",
                        `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Padloc — Source &amp; Licenses</title><body><h1>Source &amp; Licenses</h1><p>Padloc — Copyright MaKleSoft UG and contributors.</p><ul>${licenseFiles
                            .map((name) => `<li><a href="${name}">${name}</a></li>`)
                            .join(
                                ""
                            )}<li><a href="${noticeName}">Third-party notices</a></li></ul><p>Source revision: ${escapeHtml(
                            revision || "unavailable; the repository link is not a version-matched source offer"
                        )}${
                            modified ? " (local modifications; the archive contains the base revision only)" : ""
                        }.</p><p><a href="${escapeHtml(
                            sourceUrl
                        )}">Download source, assets, and build scripts</a> · <a href="SOURCE.json">Build source information</a></p><p>See the source archive's README.md for build and installation instructions. Modified distributions must provide their corresponding source.</p></body></html>`
                    );
                }
            );
        });
    }
}
module.exports = { LicensePlugin, noticeAsset };
