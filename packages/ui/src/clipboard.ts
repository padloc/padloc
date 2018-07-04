import { Record, Field } from "@padlock/core/lib/data.js";
import { Clipboard } from "./elements/clipboard";

let singleton: Clipboard | undefined;

export function setClipboard(record: Record, field: Field, duration?: number) {
    if (!singleton) {
        const el = document.createElement("pl-clipboard");
        document.body.appendChild(el);
        el.offsetLeft;
        singleton = el as any as Clipboard;
    }

    return singleton.set(record, field, duration);
}

export function clearClipboard() {
    if (singleton) {
        singleton.clear();
    }
}
