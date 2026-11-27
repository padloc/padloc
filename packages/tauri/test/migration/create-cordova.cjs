// Standalone Cordova wrapper for the encrypted migration fixture.
const fs = require("node:fs");
const path = require("node:path");
const target = process.argv[2];
const appId = process.argv[3] || "app.padloc.tauri.ios-test";
if (!["app.padloc.tauri.ios-test", "app.padloc.tauri.migration-test"].includes(appId))
    throw new Error("Only disposable test app IDs are allowed");
if (!target || !path.isAbsolute(target)) throw new Error("Pass a new absolute fixture directory");
if (fs.existsSync(target)) throw new Error("Refusing to overwrite an existing directory");
fs.mkdirSync(path.join(target, "www"), { recursive: true });
fs.writeFileSync(
    path.join(target, "config.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<widget id="${appId}" version="4.3.0" ios-CFBundleVersion="4.3.0.0" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
<name>Padloc Migration Test</name><content src="index.html"/>
<preference name="BackupWebStorage" value="cloud"/>
<preference name="deployment-target" value="15.0"/>
<platform name="ios"><preference name="WKWebViewOnly" value="true"/></platform>
</widget>`
);
fs.writeFileSync(
    path.join(target, "package.json"),
    JSON.stringify(
        { name: "padloc-migration-fixture", version: "4.3.0", private: true, cordova: { platforms: [], plugins: {} } },
        null,
        2
    )
);
console.log(target);
