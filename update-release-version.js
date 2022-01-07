const { resolve } = require("path");
const { writeFileSync } = require("fs");

if (!process.argv[2]) {
    console.log("Missing version argument");
    process.exit(-1);
}

if (!process.argv[3]) {
    console.log("Missing build argument");
    process.exit(-1);
}

const version = process.argv[2];
const build = process.argv[3];

const manifestFilePath = resolve(__dirname, "assets", "manifest.json");

const manifest = require(manifestFilePath);

manifest.version = version;
manifest.build = `${version}.${build}`;

writeFileSync(manifestFilePath, JSON.stringify(manifest, null, 4), "utf-8");
