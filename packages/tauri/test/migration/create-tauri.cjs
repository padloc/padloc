const fs = require("node:fs"),
    path = require("node:path");
const [source, target, frontend] = process.argv.slice(2);
if (![source, target, frontend].every((directory) => directory && path.isAbsolute(directory)))
    throw new Error("Pass absolute directories for the Cordova fixture, Tauri config output, and encrypted frontend");
if (!fs.existsSync(path.join(frontend, "index.html"))) throw new Error("Build the encrypted Tauri frontend first");
const config = fs.readFileSync(path.join(source, "config.xml"), "utf8");
const id = (config.match(/<widget id="([^"]+)"/) || [])[1];
if (!["app.padloc.tauri.ios-test", "app.padloc.tauri.migration-test"].includes(id))
    throw new Error("Only disposable test app IDs are allowed");
if (fs.existsSync(target)) throw new Error("Refusing to overwrite an existing directory");
fs.mkdirSync(target);
fs.writeFileSync(
    path.join(target, "tauri.json"),
    JSON.stringify(
        {
            identifier: id,
            productName: "Padloc Migration Test",
            version: "4.3.1",
            build: { beforeBuildCommand: "", frontendDist: frontend },
        },
        null,
        2
    )
);
console.log(path.join(target, "tauri.json"));
