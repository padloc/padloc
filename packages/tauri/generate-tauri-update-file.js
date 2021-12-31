const { resolve } = require("path");
const { readFileSync, writeFileSync } = require("fs");

const tauriUpdateFilePath = resolve(__dirname, "tauri-update.json");
const packageFilePath = resolve(__dirname, "package.json");

const tauriUpdate = {
    name: "v[VERSION]",
    pub_date: "[DATE]",
    platforms: {
        darwin: {
            signature: "[MACOS_SIGNATURE]",
            url: "https://github.com/padloc/padloc/releases/download/v[VERSION]/Padloc.app.tar.gz",
        },
        linux: {
            signature: "[LINUX_SIGNATURE]",
            url: "https://github.com/padloc/padloc/releases/download/v[VERSION]/Padloc.AppImage.tar.gz",
        },
        win64: {
            signature: "[WINDOWS_SIGNATURE]",
            url: "https://github.com/padloc/padloc/releases/download/v[VERSION]/Padloc.x64.msi.zip",
        },
    },
};

const packageFileContents = readFileSync(packageFilePath, "utf-8");
const package = JSON.parse(packageFileContents);

const { version } = package;
const now = new Date().toISOString();
// TODO: Will know where these are set once we sign a release
const darwinSignature = "";
const linuxSignature = "";
const windowsSignature = "";

tauriUpdate.name = `v${version}`;
tauriUpdate.pub_date = now;
tauriUpdate.platforms.darwin.signature = darwinSignature;
tauriUpdate.platforms.darwin.url = `https://github.com/padloc/padloc/releases/download/v${version}/Padloc.app.tar.gz`;
tauriUpdate.platforms.linux.signature = linuxSignature;
tauriUpdate.platforms.linux.url = `https://github.com/padloc/padloc/releases/download/v${version}/Padloc.AppImage.tar.gz`;
tauriUpdate.platforms.win64.signature = windowsSignature;
tauriUpdate.platforms.win64.url = `https://github.com/padloc/padloc/releases/download/v${version}/Padloc.x64.msi.zip`;

writeFileSync(tauriUpdateFilePath, JSON.stringify(tauriUpdate, null, 4), "utf-8");
