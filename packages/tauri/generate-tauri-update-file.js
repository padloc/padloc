const { resolve } = require("path");
const { readFileSync, writeFileSync } = require("fs");

const tauriUpdateFilePath = resolve(__dirname, "tauri-update.json");
const packageFilePath = resolve(__dirname, "package.json");

const tauriUpdate = {
    name: "[VERSION]",
    pub_date: "[DATE]",
    platforms: {
        darwin: {
            signature: "[URL]",
            url: "[URL]",
        },
        linux: {
            signature: "[URL]",
            url: "[URL]",
        },
        win64: {
            signature: "[URL]",
            url: "[URL]",
        },
    },
};

const packageFileContents = readFileSync(packageFilePath, "utf-8");
const package = JSON.parse(packageFileContents);

const { version } = package;
const now = new Date().toISOString();

tauriUpdate.name = `v${version}`;
tauriUpdate.pub_date = now;
tauriUpdate.platforms.darwin.url = `https://github.com/padloc/padloc/releases/download/v${version}/Padloc.app.tar.gz`;
tauriUpdate.platforms.darwin.signature = `${tauriUpdate.platforms.darwin.url}.sig`;
tauriUpdate.platforms.linux.url = `https://github.com/padloc/padloc/releases/download/v${version}/padloc_${version}_amd64.AppImage.tar.gz`;
tauriUpdate.platforms.linux.signature = `${tauriUpdate.platforms.linux.url}.sig`;
tauriUpdate.platforms.win64.url = `https://github.com/padloc/padloc/releases/download/v${version}/Padloc_${version}_x64.msi.zip`;
tauriUpdate.platforms.win64.signature = `${tauriUpdate.platforms.win64.url}.sig`;

writeFileSync(tauriUpdateFilePath, JSON.stringify(tauriUpdate, null, 4), "utf-8");
