import { browser } from "webextension-polyfill-ts";

export type Message =
    | { type: "loggedIn" }
    | { type: "loggedOut" }
    | { type: "locked" }
    | { type: "unlocked"; masterKey: string }
    | { type: "requestMasterKey" }
    | { type: "fillActive"; value: string }
    | { type: "fillOnDrop"; value: string }
    | { type: "calcTOTP"; secret: string }
    | { type: "isContentReady" }
    | { type: "hasActiveInput" };

export async function messageTab(msg: Message) {
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
        let contentReady = false;
        try {
            contentReady = await browser.tabs.sendMessage(activeTab.id!, { type: "isContentReady" });
        } catch (e) {}

        if (!contentReady) {
            await browser.tabs.executeScript(activeTab.id, { file: "/content.js" });
        }

        return browser.tabs.sendMessage(activeTab.id!, msg);
    } else {
        return Promise.resolve();
    }
}
