import { VaultItem, Field } from "@padloc/core/lib/item.js";
import "./elements/clipboard";
import { Clipboard } from "./elements/clipboard.js";
import { getSingleton } from "./singleton.js"

export function setClipboard(item: VaultItem, field: Field, duration?: number) {
    const singleton = getSingleton("pl-clipboard") as Clipboard;
    return singleton.set(item, field, duration);
}

export function clearClipboard() {
    const singleton = getSingleton("pl-clipboard") as Clipboard;
    singleton.clear();
}
