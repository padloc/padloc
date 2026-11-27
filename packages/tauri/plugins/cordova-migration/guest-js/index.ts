import { invoke } from "@tauri-apps/api/core";

export function readCordovaStorage(): Promise<unknown> {
    return invoke("plugin:cordova-migration|read_cordova_storage");
}
