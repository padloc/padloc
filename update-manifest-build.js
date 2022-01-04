const { resolve } = require("path");
const { writeFileSync } = require("fs");

const manifestFilePath = resolve(__dirname, "assets", "manifest.json");

if (!process.argv[2]) {
    console.log("Missing github-sha argument");
    process.exit(-1);
}

const manifest = require(manifestFilePath);

manifest.build = `${manifest.build}-${process.argv[2]}`;

writeFileSync(manifestFilePath, JSON.stringify(manifest, null, 4), "utf-8");
