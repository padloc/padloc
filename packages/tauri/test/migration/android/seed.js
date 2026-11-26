(() => {
    const db = indexedDB.open("localforage", 1);
    db.onupgradeneeded = () => db.result.createObjectStore("keyvaluepairs");
    db.onsuccess = () => {
        const tx = db.result.transaction("keyvaluepairs", "readwrite");
        const store = tx.objectStore("keyvaluepairs");
        store.put({ title: "Synthetic pending edit", pending: true }, "padloc_android_migration_probe");
        store.put(new Uint8Array([0, 255, 128, 42]), "padloc_android_migration_bytes");
        tx.oncomplete = () => {
            window.padlocProbeResult = { status: "seeded" };
        };
        tx.onerror = () => {
            window.padlocProbeResult = { status: "error" };
        };
    };
    db.onerror = () => {
        window.padlocProbeResult = { status: "error" };
    };
})();
