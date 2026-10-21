import browser from "webextension-polyfill";

export type Message =
    | { type: "loggedIn" }
    | { type: "loggedOut" }
    | { type: "locked" }
    | { type: "unlocked"; masterKey: string; accountId: string }
    | { type: "activity"; unlockId: string }
    | { type: "unlockStateCleared" }
    | { type: "requestMasterKey" }
    | { type: "fillActive"; value: string }
    | { type: "fillOnDrop"; value: string }
    | { type: "calcTOTP"; secret: string }
    | { type: "isContentReady" }
    | { type: "hasActiveInput" }
    | { type: "state-changed" };

export function isMessage(value: unknown): value is Message {
    if (!value || typeof value !== "object") {
        return false;
    }
    const msg = value as Record<string, unknown>;
    switch (msg.type) {
        case "unlocked":
            return typeof msg.masterKey === "string" && typeof msg.accountId === "string";
        case "activity":
            return typeof msg.unlockId === "string";
        case "fillActive":
        case "fillOnDrop":
            return typeof msg.value === "string";
        case "calcTOTP":
            return typeof msg.secret === "string";
        default:
            return [
                "loggedIn",
                "loggedOut",
                "locked",
                "unlockStateCleared",
                "requestMasterKey",
                "isContentReady",
                "hasActiveInput",
                "state-changed",
            ].includes(msg.type as string);
    }
}

export interface UnlockResponse {
    id: string;
    masterKey?: string;
}

export async function messageTab(msg: Message) {
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
        let contentReady = false;
        try {
            contentReady = await browser.tabs.sendMessage(activeTab.id!, { type: "isContentReady" });
        } catch (e) {}

        if (!contentReady) {
            await browser.scripting.executeScript({ target: { tabId: activeTab.id! }, files: ["content.js"] });
        }

        return browser.tabs.sendMessage(activeTab.id!, msg);
    } else {
        return Promise.resolve();
    }
}
