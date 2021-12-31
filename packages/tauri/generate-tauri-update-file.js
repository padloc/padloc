const { resolve } = require("path");
const { readFileSync, writeFileSync } = require("fs");

const tauriUpdateFilePath = resolve(__dirname, "tauri-update.json");
const packageFilePath = resolve(__dirname, "package.json");

const tauriUpdate = {
    name: "v[VERSION]",
    pub_date: "[DATE]",
    platforms: {
        darwin: {
            signature: "https://github.com/padloc/padloc/releases/download/v[VERSION]/Padloc.app.tar.gz.sig",
            url: "https://github.com/padloc/padloc/releases/download/v[VERSION]/Padloc.app.tar.gz",
        },
        linux: {
            signature: "https://github.com/padloc/padloc/releases/download/v[VERSION]/Padloc.AppImage.tar.gz.sig",
            url: "https://github.com/padloc/padloc/releases/download/v[VERSION]/Padloc.AppImage.tar.gz",
        },
        win64: {
            signature: "https://github.com/padloc/padloc/releases/download/v[VERSION]/Padloc.x64.msi.zip.sig",
            url: "https://github.com/padloc/padloc/releases/download/v[VERSION]/Padloc.x64.msi.zip",
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
tauriUpdate.platforms.linux.url = `https://github.com/padloc/padloc/releases/download/v${version}/Padloc.AppImage.tar.gz`;
tauriUpdate.platforms.linux.signature = `${tauriUpdate.platforms.linux.url}.sig`;
tauriUpdate.platforms.win64.url = `https://github.com/padloc/padloc/releases/download/v${version}/Padloc.x64.msi.zip`;
tauriUpdate.platforms.win64.signature = `${tauriUpdate.platforms.win64.url}.sig`;

writeFileSync(tauriUpdateFilePath, JSON.stringify(tauriUpdate, null, 4), "utf-8");
