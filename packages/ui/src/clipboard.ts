import { Record, Field } from "@padlock/core/lib/data.js";
import "./elements/clipboard";
import { Clipboard } from "./elements/clipboard.js";
import { getSingleton } from "./singleton.js"

export function setClipboard(record: Record, field: Field, duration?: number) {
    const singleton = getSingleton("pl-clipboard") as Clipboard;
    return singleton.set(record, field, duration);
}

export function clearClipboard() {
    const singleton = getSingleton("pl-clipboard") as Clipboard;
    singleton.clear();
}
