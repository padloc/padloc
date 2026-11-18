// Stage root notices only while npm packs a workspace; root files remain canonical.
const fs = require("node:fs");
const path = require("node:path");
const { root, noticeName } = require("./notices.cjs");
const workspace = path.relative(root, process.cwd()).split(path.sep);
if (workspace.length !== 2 || !["packages", "enterprise"].includes(workspace[0]) || !fs.existsSync("package.json")) {
    throw new Error("Run notice staging only from a Padloc workspace directory");
}
const enterprise = workspace[0] === "enterprise";
const files = ["LICENSE.txt", "LICENSE-AGPL.txt", noticeName, ...(enterprise ? ["LICENSE-ENTERPRISE.txt"] : [])].map(
    (name) => ({
        name,
        source: fs.readFileSync(path.join(root, name)),
        target: path.join(process.cwd(), name),
    })
);
const action = process.argv[2];
if (!["prepare", "clean"].includes(action)) throw new Error("Use prepare or clean");
for (const { name, source, target } of files) {
    if (!fs.existsSync(target)) continue;
    if (action === "prepare") throw new Error(`Remove stale generated notice ${name} before packing`);
    if (!fs.readFileSync(target).equals(source)) throw new Error(`Refusing to remove altered notice ${target}`);
}
for (const { source, target } of files) {
    if (action === "prepare") fs.writeFileSync(target, source, { flag: "wx" });
    else fs.rmSync(target, { force: true });
}
