export const MIGRATION_KEY = "__padloc_cordova_migration_v1";
export const STATE_KEY = "appstate_app-state";
export type Entry = [string, unknown];
export type Marker = {
    version: 1;
    source: "ionic://localhost";
    status: "migrated" | "absent";
    digest: string;
    count: number;
};

export function canonical(value: unknown): string {
    if (value === undefined) return "undefined";
    if (value instanceof Uint8Array) return `u8:${JSON.stringify(Array.from(value))}`;
    if (value instanceof ArrayBuffer) return `buffer:${JSON.stringify(Array.from(new Uint8Array(value)))}`;
    if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
    if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
        return `{${Object.keys(value as object)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
            .join(",")}}`;
    }
    throw new Error("Unsupported migration value.");
}

function decodeNode(node: any, depth = 0): unknown {
    if (!node || depth > 100) throw new Error("Invalid structured migration value.");
    const { t, v } = node;
    if (t === "undefined") return undefined;
    if (t === "null") return null;
    if ((t === "string" || t === "boolean") && typeof v === t) return v;
    if (t === "number" && typeof v === "number" && Number.isFinite(v)) return v;
    if (
        (t === "u8" || t === "buffer") &&
        Array.isArray(v) &&
        v.every((x) => Number.isInteger(x) && x >= 0 && x <= 255)
    ) {
        const bytes = Uint8Array.from(v);
        return t === "u8" ? bytes : bytes.buffer;
    }
    if (t === "array" && Array.isArray(v)) return v.map((x) => decodeNode(x, depth + 1));
    if (t === "object" && Array.isArray(v)) {
        const result: Record<string, unknown> = {};
        for (const pair of v) {
            if (
                !Array.isArray(pair) ||
                pair.length !== 2 ||
                typeof pair[0] !== "string" ||
                Object.prototype.hasOwnProperty.call(result, pair[0])
            )
                throw new Error("Invalid structured object.");
            Object.defineProperty(result, pair[0], {
                value: decodeNode(pair[1], depth + 1),
                enumerable: true,
                configurable: true,
                writable: true,
            });
        }
        return result;
    }
    throw new Error("Unsupported structured migration value.");
}

export function validMarker(value: unknown): value is Marker {
    const m = value as Marker;
    return (
        !!m &&
        m.version === 1 &&
        m.source === "ionic://localhost" &&
        ["migrated", "absent"].includes(m.status) &&
        /^[a-f0-9]{64}$/.test(m.digest) &&
        Number.isInteger(m.count) &&
        m.count >= 0 &&
        m.count <= 1000
    );
}

export async function migrateStorage(deps: {
    marker(): Promise<unknown>;
    readLegacy(): Promise<unknown>;
    validateState(raw: unknown): void;
    digest(value: string): Promise<string>;
    commit(entries: Entry[], marker: Marker): Promise<void>;
}): Promise<"already-complete" | "migrated" | "absent"> {
    const previous = await deps.marker();
    if (previous != null) {
        if (!validMarker(previous)) throw new Error("Invalid migration checkpoint.");
        return "already-complete";
    }
    const source = (await deps.readLegacy()) as { status: string; entries?: unknown[] };
    if (!source || !["found", "absent"].includes(source.status)) throw new Error("Legacy storage could not be read.");
    const entries: Entry[] = [];
    const keys = new Set<string>();
    if (source.status === "found") {
        if (
            !Array.isArray(source.entries) ||
            source.entries.length > 1000 ||
            JSON.stringify(source).length > 48 * 1024 * 1024
        )
            throw new Error("Invalid legacy storage.");
        for (const item of source.entries) {
            if (!Array.isArray(item) || item.length !== 2) throw new Error("Invalid legacy record.");
            const [key, encoded] = item;
            if (typeof key !== "string" || !key || key.length > 1024 || key === MIGRATION_KEY || keys.has(key))
                throw new Error("Invalid legacy record key.");
            keys.add(key);
            if (!encoded || typeof encoded !== "object") throw new Error("Invalid legacy record value.");
            const { type, value } = encoded;
            let decoded: unknown;
            if (type === "structured") decoded = decodeNode(value);
            else if (type === "json") {
                canonical(value);
                decoded = value;
            } else if (
                ["u8", "buffer"].includes(type) &&
                Array.isArray(value) &&
                value.every((x) => Number.isInteger(x) && x >= 0 && x <= 255)
            ) {
                const bytes = Uint8Array.from(value);
                decoded = type === "u8" ? bytes : bytes.buffer;
            } else throw new Error("Unsupported legacy record value.");
            if (key === STATE_KEY) deps.validateState(decoded);
            entries.push([key, decoded]);
        }
        // An empty database or auxiliary records alone must not masquerade as
        // recoverable account state. Retain them, but do not fabricate AppState.
    }
    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const status = source.status === "absent" ? "absent" : "migrated";
    const marker: Marker = {
        version: 1,
        source: "ionic://localhost",
        status,
        digest: await deps.digest(canonical(entries)),
        count: entries.length,
    };
    await deps.commit(entries, marker);
    return status;
}
