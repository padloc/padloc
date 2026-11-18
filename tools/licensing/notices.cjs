const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { createRequire } = require("node:module");

const root = path.resolve(__dirname, "../..");
const noticeName = "THIRD-PARTY-NOTICES.txt";

function packageForFile(file) {
    if (!file || !file.includes(`${path.sep}node_modules${path.sep}`)) return;
    let dir = path.dirname(file.split("?")[0]);
    while (dir !== path.dirname(dir)) {
        const manifest = path.join(dir, "package.json");
        if (fs.existsSync(manifest)) {
            const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
            if (pkg.name && pkg.version) return { ...pkg, dir };
        }
        dir = path.dirname(dir);
    }
}

function packageNotice(pkg) {
    const files = fs
        .readdirSync(pkg.dir)
        .filter(
            (name) =>
                /^(licen[sc]e|copying|notice)([._-]|$)/i.test(name) && fs.statSync(path.join(pkg.dir, name)).isFile()
        );
    if (!files.some((name) => /^(licen[sc]e|copying)([._-]|$)/i.test(name))) {
        const readme = fs.readdirSync(pkg.dir).find((name) => /^readme(?:\.|$)/i.test(name));
        const section =
            readme &&
            fs
                .readFileSync(path.join(pkg.dir, readme), "utf8")
                .match(/(?:^|\n)#{1,6} Licen[sc]e[^\n]*\n([\s\S]*)/i)?.[1];
        if (
            section &&
            /Copyright/i.test(section) &&
            /Permission is hereby granted/.test(section) &&
            /THE SOFTWARE IS PROVIDED/.test(section)
        ) {
            return `${pkg.name}@${pkg.version}\nLicense notice from ${readme}\n${section.trim()}`;
        }
        const overrides = require("./notice-overrides.json");
        const override = overrides[`${pkg.name}@${pkg.version}`];
        if (
            override &&
            createHash("sha256")
                .update(fs.readFileSync(path.join(pkg.dir, override.file)))
                .digest("hex") === override.sha256
        ) {
            return `${pkg.name}@${pkg.version}\nFull upstream notice reproduced above under ${override.notice}.`;
        }
        throw new Error(`Missing license text for ${pkg.name}@${pkg.version} (${pkg.dir})`);
    }
    return [
        `${pkg.name}@${pkg.version}`,
        `License: ${typeof pkg.license === "string" ? pkg.license : JSON.stringify(pkg.license)}`,
        ...files
            .sort()
            .filter((name) => fs.statSync(path.join(pkg.dir, name)).isFile())
            .map((name) => `\n${name}\n${fs.readFileSync(path.join(pkg.dir, name), "utf8").trim()}`),
    ].join("\n");
}

function notices(packages = []) {
    const unique = new Map(packages.map((pkg) => [`${pkg.name}@${pkg.version}`, pkg]));
    // JSZip's prebuilt browser bundle embeds dependencies invisible to webpack.
    const queue = packages.filter((pkg) => pkg.name === "jszip");
    const visited = new Set();
    for (const pkg of queue) {
        if (visited.has(pkg.dir)) continue;
        visited.add(pkg.dir);
        const resolve = createRequire(path.join(pkg.dir, "package.json")).resolve;
        for (const name of Object.keys(pkg.dependencies || {})) {
            const file = resolve
                .paths("__padloc_license_dependency__")
                .map((dir) => path.join(dir, name, "package.json"))
                .find((file) => fs.existsSync(file));
            if (!file) throw new Error(`Cannot locate license for ${pkg.name}'s dependency ${name}`);
            const dependency = packageForFile(file);
            if (dependency) {
                unique.set(`${dependency.name}@${dependency.version}`, dependency);
                queue.push(dependency);
            }
        }
    }
    return (
        fs.readFileSync(path.join(root, noticeName), "utf8") +
        [...unique.values()]
            .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))
            .map((pkg) => `\n${"=".repeat(72)}\n${packageNotice(pkg)}\n`)
            .join("")
    );
}

module.exports = { root, noticeName, packageForFile, notices };
