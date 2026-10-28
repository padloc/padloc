import { invoke } from "@tauri-apps/api/core";
import { AppState } from "@padloc/core/src/app";
// @ts-ignore
import localforage from "localforage/src/localforage";
import { canonical, Entry, Marker, MIGRATION_KEY, migrateStorage } from "./migration-state";

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("localforage");
        request.onsuccess = () => resolve(request.result);
        request.onerror = request.onblocked = () => reject(new Error("Destination storage unavailable."));
    });
}

// All conflict checks, writes, read-back verification and checkpoint creation
// share one transaction. A crash/abort commits none of them.
export function commitMigration(db: IDBDatabase, entries: Entry[], marker: Marker): Promise<void> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("keyvaluepairs", "readwrite");
        const store = tx.objectStore("keyvaluepairs");
        let failure = "Migration write failed.";
        const abort = (message: string) => {
            failure = message;
            tx.abort();
        };
        tx.oncomplete = () => resolve();
        tx.onerror = tx.onabort = () => reject(new Error(failure));
        const keys = store.getAllKeys(),
            values = store.getAll();
        values.onsuccess = () => {
            try {
                const existing = new Map(keys.result.map((key, i) => [String(key), values.result[i]]));
                if (existing.has(MIGRATION_KEY)) {
                    abort("Migration checkpoint changed; retry startup.");
                    return;
                }
                // Never overwrite independently initialized Tauri data. Exact
                // preexisting copies can be verified and checkpointed safely.
                if (
                    entries.length &&
                    existing.size &&
                    (existing.size !== entries.length ||
                        entries.some(
                            ([key, value]) => !existing.has(key) || canonical(existing.get(key)) !== canonical(value)
                        ))
                ) {
                    abort("Existing Tauri data conflicts with Cordova data.");
                    return;
                }
                let remaining = entries.length;
                if (!remaining) {
                    store.put(marker, MIGRATION_KEY);
                    return;
                }
                for (const [key, value] of entries) {
                    store.put(value, key);
                    const read = store.get(key);
                    read.onsuccess = () => {
                        try {
                            if (canonical(read.result) !== canonical(value)) {
                                abort("Migration verification failed.");
                                return;
                            }
                            if (--remaining === 0) store.put(marker, MIGRATION_KEY);
                        } catch {
                            abort("Migration verification failed.");
                        }
                    };
                }
            } catch {
                abort("Migration validation failed.");
            }
        };
    });
}

export async function migrateCordovaStorage(): Promise<void> {
    await localforage.ready();
    if (localforage.driver() !== localforage.INDEXEDDB) throw new Error("Unsupported destination storage driver.");
    const db = await openDatabase();
    try {
        await migrateStorage({
            marker: () => localforage.getItem(MIGRATION_KEY),
            readLegacy: () => invoke("read_cordova_storage"),
            validateState(raw) {
                if (
                    !raw ||
                    typeof raw !== "object" ||
                    (raw as AppState).id !== "app-state" ||
                    (raw as AppState).kind !== "appstate"
                )
                    throw new Error("Invalid legacy app state.");
                // Schema upgrades performed by fromRaw must not alter the raw
                // record we copy and verify. This clone is validation-only.
                new AppState().fromRaw(JSON.parse(JSON.stringify(raw)));
            },
            async digest(value) {
                const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
                return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
            },
            commit: (entries, marker) => commitMigration(db, entries, marker),
        });
    } finally {
        db.close();
    }
}
