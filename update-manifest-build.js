const { resolve } = require("path");
const { writeFileSync } = require("fs");

const manifestFilePath = resolve(__dirname, "assets", "manifest.json");

const manifest = require(manifestFilePath);

const buildVersion = parseInt(new Date().getTime().toString().slice(-5), 10).toString();

manifest.build = `${manifest.version}.${buildVersion}`;

writeFileSync(manifestFilePath, JSON.stringify(manifest, null, 4), "utf-8");
