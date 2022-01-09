const { resolve, join } = require("path");
const fs = require("fs");
const { xml2js, js2xml } = require("xml-js");

require("dotenv").config();

const rootDir = resolve(__dirname, "../..");
const assetsDir = resolve(rootDir, process.env.PL_ASSETS_DIR || "assets");
const configPath = resolve(__dirname, "config.xml");

const { version } = require("./package.json");
const { name, appId } = require(join(assetsDir, "manifest.json"));

const vendorVersion = process.env.PL_VENDOR_VERSION || version;
const vendorBuild = `${vendorVersion}.${
    process.env.PL_BUILD_ENV === "Production" ? process.env.RELEASE_BUILD : devBuildVersion
}`;

async function main() {
    const configXML = fs.readFileSync(configPath, "utf-8");
    const configObj = xml2js(configXML, { compact: true });

    configObj.widget._attributes.id = appId;
    configObj.widget._attributes.version = vendorVersion;
    configObj.widget._attributes["ios-CFBundleVersion"] = vendorBuild;
    configObj.widget._attributes["android-versionCode"] = vendorBuild
        .split(".")
        .map((part) => part.padStart(2, "0"))
        .join("");

    configObj.widget.name._text = name;

    fs.writeFileSync(configPath, js2xml(configObj, { compact: true, spaces: 4 }));
}

main();
