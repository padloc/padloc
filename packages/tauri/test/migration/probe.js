/* global localforage, cordova */
// No network, accounts, tokens, or real vault data. Do not use production ID.
const fixture = {
    schema: 1,
    marker: "padloc-cordova-migration-synthetic-v1",
    settings: { autoLock: true, autoLockDelay: 1, theme: "dark" },
    offlineEdits: [
        {
            id: "synthetic-offline-item",
            name: "Unsynced fixture",
            fields: [
                { name: "Password", type: "password", value: "" },
                { name: "URL", type: "url", value: "" },
                { name: "TOTP", type: "totp", value: "JBSWY3DPEHPK3PXP" },
            ],
        },
    ],
};
async function inspect() {
    await localforage.ready();
    const actual = await localforage.getItem("padloc_migration_probe");
    document.getElementById("status").textContent = JSON.stringify(
        {
            runtime: typeof cordova === "undefined" ? "tauri" : "cordova",
            origin: location.origin,
            driver: localforage.driver(),
            database: localforage.config().name,
            store: localforage.config().storeName,
            found: actual !== null,
            matches: actual !== null && JSON.stringify(actual) === JSON.stringify(fixture),
            binary: Array.from((await localforage.getItem("padloc_migration_binary")) || []),
        },
        null,
        2
    );
}
document.getElementById("seed").onclick = async () => {
    try {
        if (location.protocol !== "ionic:") throw new Error("Seeding is restricted to the legacy ionic origin");
        if ((await localforage.getItem("padloc_migration_probe")) !== null)
            throw new Error("Fixture already exists; refusing to overwrite");
        await localforage.setItem("padloc_migration_probe", fixture);
        await localforage.setItem("padloc_migration_binary", new Uint8Array([0, 255, 128, 42]));
        await inspect();
    } catch (error) {
        document.getElementById("status").textContent = String(error);
    }
};
(typeof cordova === "undefined"
    ? Promise.resolve()
    : new Promise((resolve) => document.addEventListener("deviceready", resolve, { once: true }))
)
    .then(inspect)
    .catch((error) => {
        document.getElementById("status").textContent = String(error);
    });
// Fixture-only privacy acknowledgement; never loaded by the real app.
async function uncoverFixture() {
    if (!window.__TAURI_INTERNALS__) return;
    const state = await window.__TAURI_INTERNALS__.invoke("background_state");
    if (!state.inactive) await window.__TAURI_INTERNALS__.invoke("resume_complete", { generation: state.generation });
}
window.addEventListener("padloc-native-resume", uncoverFixture);
uncoverFixture();
function showLegacyProbe() {
    if (!window.__padlocLegacyProbe) return;
    let el = document.getElementById("legacy");
    if (!el) {
        el = document.createElement("pre");
        el.id = "legacy";
        document.body.appendChild(el);
    }
    el.textContent = "Legacy reader (read only):\n" + JSON.stringify(window.__padlocLegacyProbe, null, 2);
}
window.addEventListener("padloc-legacy-probe", showLegacyProbe);
showLegacyProbe();
