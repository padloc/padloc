import { VaultItem, Field } from "@padloc/core/src/item";
import "../elements/clipboard";
import { Clipboard } from "../elements/clipboard";
import { getSingleton } from "./singleton"

export async function setClipboard(item: VaultItem, field: Field, duration?: number) {
    const singleton = getSingleton("pl-clipboard") as Clipboard;
    return singleton.set(item, field, duration);
}

export function clearClipboard() {
    const singleton = getSingleton("pl-clipboard") as Clipboard;
    singleton.clear();
}
