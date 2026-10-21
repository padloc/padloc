const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const semver = require("semver");
const root = path.resolve(__dirname, "..");
process.chdir(root);
const manifests = ["package.json", ...fs.readdirSync("packages").map((name) => `packages/${name}/package.json`)];
const packages = manifests.map((file) => ({ file, data: JSON.parse(fs.readFileSync(file, "utf8")) }));
function npm(args) {
    const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", args, {
        stdio: "inherit",
        shell: process.platform === "win32",
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
}
const [command, value, ...flags] = process.argv.slice(2);
if (command === "version") {
    const version = semver.valid(value) || semver.inc(packages[0].data.version, value);
    if (!version || flags.length)
        throw new Error("Usage: npm run update-version -- <version|major|minor|patch|prerelease>");
    const names = new Set(packages.map(({ data }) => data.name));
    for (const { file, data } of packages) {
        data.version = version;
        for (const section of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
            for (const name of Object.keys(data[section] || {})) {
                if (names.has(name)) data[section][name] = version;
            }
        }
        fs.writeFileSync(file, JSON.stringify(data, null, 4) + "\n");
    }
    npm(["install", "--package-lock-only", "--ignore-scripts"]);
    const lockPath = path.join(root, "package-lock.json");
    fs.writeFileSync(
        lockPath,
        fs
            .readFileSync(lockPath, "utf8")
            .replaceAll("git+ssh://git@github.com/padloc/maildev.git", "git+https://github.com/padloc/maildev.git")
    );
    console.log(
        `Updated all packages to ${version}. Review and commit the manifests and lockfile, then tag v${version}.`
    );
} else if (command === "publish") {
    const args = [value, ...flags].filter(Boolean);
    if (args.some((arg) => arg !== "--dry-run")) throw new Error("Usage: npm run release:publish -- [--dry-run]");
    // Publish dependencies first and exclude private application packages.
    const pending = packages.slice(1).filter(({ data }) => !data.private);
    while (pending.length) {
        const index = pending.findIndex(
            ({ data }) => !pending.some(({ data: other }) => other !== data && data.dependencies?.[other.name])
        );
        if (index === -1) throw new Error("Circular publish dependencies");
        const [{ data }] = pending.splice(index, 1);
        npm(["publish", "--workspace", data.name, ...args]);
    }
} else {
    throw new Error("Expected version or publish");
}
