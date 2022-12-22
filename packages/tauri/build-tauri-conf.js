const { resolve } = require("path");
const { writeFileSync, readFileSync } = require("fs");
const TOML = require("@iarna/toml");

require("dotenv").config();

const rootDir = resolve(__dirname, "../..");
const assetsDir = resolve(rootDir, process.env.PL_ASSETS_DIR || "assets");

const tauriConfigFilePath = resolve(__dirname, "src-tauri", "tauri.conf.json");
const cargoTomlFilePath = resolve(__dirname, "src-tauri", "Cargo.toml");
const packageFilePath = resolve(__dirname, "package.json");
const manifestFilePath = resolve(assetsDir, "manifest.json");

const tauriConfig = require(tauriConfigFilePath);
const { version } = require(packageFilePath);
const manifest = require(manifestFilePath);

const vendorVersion = process.env.PL_VENDOR_VERSION || version;
const vendorName = manifest.name;
const vendorNameLowercase = vendorName.toLowerCase();
const vendorBaseUrl = process.env.PL_VENDOR_BASE_URL || "https://github.com/padloc/padloc";

tauriConfig.package.version = vendorVersion;
tauriConfig.package.productName = vendorName;
tauriConfig.tauri.bundle.identifier = manifest.appId;
tauriConfig.tauri.windows[0].title = vendorName;
tauriConfig.tauri.updater.endpoints[0] = `${vendorBaseUrl}/releases/latest/download/tauri-update.json`;

writeFileSync(tauriConfigFilePath, JSON.stringify(tauriConfig, null, 4), "utf-8");

const cargoToml = TOML.parse(readFileSync(cargoTomlFilePath, "utf-8"));

cargoToml.package.name = vendorNameLowercase;
cargoToml.package.description = vendorName;
cargoToml.package.version = vendorVersion;
cargoToml.package.authors = [manifest.author];
cargoToml.package.repository = vendorBaseUrl;

writeFileSync(cargoTomlFilePath, TOML.stringify(cargoToml), "utf-8");
