import { browser } from "webextension-polyfill-ts";
import { VaultItem } from "@padloc/core/src/item";

export type Message =
    | {
          type: "loggedIn";
      }
    | {
          type: "loggedOut";
      }
    | {
          type: "locked";
      }
    | {
          type: "unlocked";
          masterKey: string;
      }
    | { type: "requestMasterKey" }
    | { type: "autoFill"; item: VaultItem; index?: number }
    | { type: "calcTOTP"; secret: string }
    | { type: "isContentReady" };

export async function messageTab(msg: Message) {
    const [activeTab] = await browser.tabs.query({ active: true });
    if (activeTab) {
        let contentReady = false;
        try {
            contentReady = await browser.tabs.sendMessage(activeTab.id!, { type: "isContentReady" });
        } catch (e) {}

        if (!contentReady) {
            await browser.tabs.executeScript(activeTab.id, { file: "/content.js" });
        }

        browser.tabs.sendMessage(activeTab.id!, msg);
        window.close();
    }
}
