const { resolve, join } = require("path");
const fs = require("fs");
const { xml2js, js2xml } = require("xml-js");

const rootDir = resolve(__dirname, "../..");
const assetsDir = resolve(rootDir, process.env.PL_ASSETS_DIR || "assets");
const configPath = resolve(__dirname, "config.xml");

const { name, version, appId, build } = require(join(assetsDir, "manifest.json"));

async function main() {
    const configXML = fs.readFileSync(configPath, "utf-8");
    const configObj = xml2js(configXML, { compact: true });

    configObj.widget._attributes.id = appId;
    configObj.widget._attributes.version = version;
    configObj.widget._attributes["ios-CFBundleVersion"] = build;
    configObj.widget._attributes["android-versionCode"] = build
        .split(".")
        .map((part) => part.padStart(2, "0"))
        .join("");

    configObj.widget.name._text = name;

    fs.writeFileSync(configPath, js2xml(configObj, { compact: true, spaces: 4 }));
}

main();
