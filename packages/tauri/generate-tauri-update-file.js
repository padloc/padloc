const { resolve } = require("path");
const { writeFileSync } = require("fs");

const tauriUpdateFilePath = resolve(__dirname, "tauri-update.json");
const packageFilePath = resolve(__dirname, "package.json");

const { version } = require(packageFilePath);
const now = new Date().toISOString();

const baseUrl = `https://github.com/padloc/padloc/releases/download/v${version}`;
const tauriUpdate = {
    name: `v${version}`,
    pub_date: now,
    platforms: {
        darwin: {
            url: `${baseUrl}/Padloc.app.tar.gz`,
            signature: `${baseUrl}/Padloc.app.tar.gz.sig`,
        },
        linux: {
            url: `${baseUrl}/padloc_${version}_amd64.AppImage.tar.gz`,
            signature: `${baseUrl}/padloc_${version}_amd64.AppImage.tar.gz.sig`,
        },
        win64: {
            url: `${baseUrl}/Padloc_${version}_x64.msi.zip`,
            signature: `${baseUrl}/Padloc_${version}_x64.msi.zip.sig`,
        },
    },
};

writeFileSync(tauriUpdateFilePath, JSON.stringify(tauriUpdate, null, 4), "utf-8");
