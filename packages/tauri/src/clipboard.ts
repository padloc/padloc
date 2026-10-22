import { readText, writeSecret } from "@tauri-apps/plugin-clipboard-manager";

// Preserve invocation order when IPC writes overlap (copy, countdown clear,
// another copy). A failed operation must not poison subsequent operations.
export class NativeClipboard {
    private _pending: Promise<unknown> = Promise.resolve();

    private _enqueue<T>(operation: () => Promise<T>): Promise<T> {
        const result = this._pending.then(operation);
        this._pending = result.catch(() => undefined);
        return result;
    }

    set(text: string): Promise<void> {
        return this._enqueue(() => writeSecret(text));
    }

    get(): Promise<string> {
        return this._enqueue(() => readText());
    }
}
