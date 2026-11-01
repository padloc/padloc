// Runs only in a native-created, network-blocked ionic://localhost WebView.
(() => {
    let sent = false;
    const report = (value) => {
        if (!sent) {
            sent = true;
            window.webkit.messageHandlers.padlocMigration.postMessage(value);
        }
    };
    const fail = () => report({ status: "error" });
    const encodeNode = (value, depth = 0) => {
        if (depth > 100) throw new Error();
        if (value === undefined) return { t: "undefined" };
        if (value === null) return { t: "null" };
        if (
            typeof value === "string" ||
            typeof value === "boolean" ||
            (typeof value === "number" && Number.isFinite(value))
        )
            return { t: typeof value, v: value };
        if (value instanceof Uint8Array) return { t: "u8", v: Array.from(value) };
        if (value instanceof ArrayBuffer) return { t: "buffer", v: Array.from(new Uint8Array(value)) };
        if (Array.isArray(value)) return { t: "array", v: Array.from(value, (x) => encodeNode(x, depth + 1)) };
        if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype)
            return { t: "object", v: Object.entries(value).map(([k, v]) => [k, encodeNode(v, depth + 1)]) };
        throw new Error();
    };
    const encode = (value) => ({ type: "structured", value: encodeNode(value) });
    try {
        const request = indexedDB.open("localforage");
        request.onupgradeneeded = () => {
            request.transaction.abort();
            // A historical localStorage fallback must not be mistaken for no data.
            const fallback = Object.keys(localStorage).some((key) => key.startsWith("localforage/"));
            report({ status: fallback ? "unsupported" : "absent" });
        };
        request.onerror = fail;
        request.onblocked = fail;
        request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("keyvaluepairs")) {
                db.close();
                fail();
                return;
            }
            const tx = db.transaction("keyvaluepairs", "readonly");
            const entries = [];
            let size = 0;
            const cursor = tx.objectStore("keyvaluepairs").openCursor();
            cursor.onsuccess = () => {
                try {
                    if (!cursor.result) return;
                    if (entries.length >= 1000 || typeof cursor.result.key !== "string") throw new Error();
                    const entry = [cursor.result.key, encode(cursor.result.value)];
                    size += JSON.stringify(entry).length;
                    if (size > 48 * 1024 * 1024) throw new Error();
                    entries.push(entry);
                    cursor.result.continue();
                } catch {
                    tx.abort();
                }
            };
            tx.oncomplete = () => {
                db.close();
                report({ status: "found", entries });
            };
            tx.onabort = tx.onerror = () => {
                db.close();
                fail();
            };
        };
    } catch {
        fail();
    }
})();
