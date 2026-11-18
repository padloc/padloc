const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { root, noticeName } = require("./notices.cjs");

for (const [file, provenance] of Object.entries(require("./wordlist-sources.json"))) {
    assert.equal(
        createHash("sha256")
            .update(fs.readFileSync(path.join(root, file)))
            .digest("hex"),
        provenance.sha256,
        `Update provenance for ${file}`
    );
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "padloc-license-check-"));
try {
    for (const workspace of ["packages/core", "packages/locale", "enterprise/admin", "enterprise/server"]) {
        const enterprise = workspace.startsWith("enterprise/");
        const pkg = JSON.parse(fs.readFileSync(path.join(root, workspace, "package.json"), "utf8"));
        const result = JSON.parse(
            execFileSync("npm", ["pack", "--silent", "--json", "--workspace", pkg.name, "--pack-destination", temp], {
                cwd: root,
                encoding: "utf8",
            })
        )[0];
        const archive = path.join(temp, result.filename);
        for (const name of [
            "LICENSE.txt",
            "LICENSE-AGPL.txt",
            noticeName,
            ...(enterprise ? ["LICENSE-ENTERPRISE.txt"] : []),
        ]) {
            assert(
                result.files.some((file) => file.path === name),
                `${workspace} archive omits ${name}`
            );
            const packed = execFileSync("tar", ["-xOf", archive, `package/${name}`]);
            assert(packed.equals(fs.readFileSync(path.join(root, name))), `${workspace} has stale ${name}`);
            assert(!fs.existsSync(path.join(root, workspace, name)), `${workspace} did not clean staged ${name}`);
        }
        assert.equal(pkg.license, enterprise ? "SEE LICENSE IN LICENSE-ENTERPRISE.txt" : "AGPL-3.0-only");
        console.log(`Verified ${workspace} archive`);
    }
    for (const dir of process.argv.slice(2)) {
        const manifest = JSON.parse(fs.readFileSync(path.join(dir, "SOURCE.json"), "utf8"));
        assert(/^[a-f0-9]{40}$/.test(manifest.revision), `${dir} lacks a source revision`);
        if (process.env.PL_SOURCE_URL) assert.equal(manifest.sourceUrl, process.env.PL_SOURCE_URL);
        else assert(manifest.sourceUrl.includes(manifest.revision), `${dir} source URL is not revision-specific`);
        const licenseFiles =
            manifest.edition === "enterprise"
                ? ["LICENSE.txt", "LICENSE-AGPL.txt", "LICENSE-ENTERPRISE.txt"]
                : ["LICENSE-AGPL.txt"];
        for (const name of licenseFiles)
            assert(
                fs.readFileSync(path.join(dir, name)).equals(fs.readFileSync(path.join(root, name))),
                `${dir} has stale ${name}`
            );
        const notices = fs.readFileSync(path.join(dir, noticeName), "utf8");
        assert(notices.includes("Tom Wu") && notices.includes("Stanford") && notices.includes("Space Mono"));
        assert(notices.includes("lit@"), `${dir} omits bundled npm notices`);
        if (notices.includes("jszip@")) assert(notices.includes("pako@"), `${dir} omits JSZip dependency notices`);
        assert(fs.readFileSync(path.join(dir, "licenses.html"), "utf8").includes(manifest.sourceUrl));
        console.log(`Verified ${dir} notices and source links`);
    }
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
