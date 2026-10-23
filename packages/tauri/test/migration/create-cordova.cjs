// Standalone origin/storage fixture; never uses either installed Padloc app ID.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const target = process.argv[2];
const appId = process.argv[3] || "app.padloc.tauri.ios-test";
if (!["app.padloc.tauri.ios-test", "app.padloc.tauri.migration-test"].includes(appId)) throw new Error("Only disposable test app IDs are allowed");
if (!target || !path.isAbsolute(target)) throw new Error('Pass a new absolute fixture directory');
if (fs.existsSync(target)) throw new Error('Refusing to overwrite an existing directory');
fs.mkdirSync(path.join(target, 'www'), { recursive: true });
fs.writeFileSync(path.join(target, 'config.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<widget id="${appId}" version="4.3.0" ios-CFBundleVersion="4.3.0.0" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
<name>Padloc Migration Test</name><content src="index.html"/>
<preference name="BackupWebStorage" value="cloud"/>
<preference name="deployment-target" value="15.0"/>
<platform name="ios"><preference name="WKWebViewOnly" value="true"/></platform>
</widget>`);
fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify({name:'padloc-migration-fixture',version:'4.3.0',private:true,cordova:{platforms:[],plugins:{}}},null,2));
fs.copyFileSync(path.join(root,'node_modules/localforage/dist/localforage.js'),path.join(target,'www/localforage.js'));
fs.copyFileSync(path.join(__dirname,'probe.js'),path.join(target,'www/probe.js'));
fs.writeFileSync(path.join(target,'www/index.html'),`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Migration storage fixture</title><style>body{font:18px system-ui;padding:60px 20px;overflow-wrap:anywhere}pre{white-space:pre-wrap}button{padding:16px}</style></head><body><h1>Migration storage fixture</h1><p>Synthetic data only. This is not a vault.</p><button id="seed">Seed synthetic records</button><pre id="status">Starting…</pre><script src="cordova.js"></script><script src="localforage.js"></script><script src="probe.js"></script></body></html>`);
console.log(target);
