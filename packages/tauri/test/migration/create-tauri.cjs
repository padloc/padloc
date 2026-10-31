const fs = require("node:fs"),
    path = require("node:path");
const [source, target] = process.argv.slice(2);
if (!source || !target || !path.isAbsolute(source) || !path.isAbsolute(target))
    throw new Error("Pass absolute Cordova fixture and new Tauri fixture directories");
const config = fs.readFileSync(path.join(source, "config.xml"), "utf8");
const id = (config.match(/<widget id="([^"]+)"/) || [])[1];
if (!["app.padloc.tauri.ios-test", "app.padloc.tauri.migration-test"].includes(id))
    throw new Error("Only disposable test app IDs are allowed");
if (fs.existsSync(target)) throw new Error("Refusing to overwrite an existing directory");
fs.mkdirSync(path.join(target, "www"), { recursive: true });
for (const file of ["localforage.js", "probe.js"])
    fs.copyFileSync(path.join(source, "www", file), path.join(target, "www", file));
fs.writeFileSync(
    path.join(target, "www/index.html"),
    fs.readFileSync(path.join(source, "www/index.html"), "utf8").replace('<script src="cordova.js"></script>', "")
);
fs.writeFileSync(
    path.join(target, "tauri.json"),
    JSON.stringify(
        {
            identifier: id,
            productName: "Padloc Migration Test",
            version: "4.3.1",
            build: { beforeBuildCommand: "", frontendDist: path.join(target, "www") },
        },
        null,
        2
    )
);
console.log(path.join(target, "tauri.json"));
