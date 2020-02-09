import { browser, Menus } from "webextension-polyfill-ts";
import { setPlatform } from "@padloc/core/src/platform";
import { App } from "@padloc/core/src/app";
import { bytesToBase64, base64ToBytes, base32ToBytes } from "@padloc/core/src/encoding";
import { AjaxSender } from "@padloc/app/src/lib/ajax";
import { totp } from "@padloc/core/src/otp";
import { debounce } from "@padloc/core/src/util";
import { ExtensionPlatform } from "./platform";
import { Message, messageTab } from "./message";

setPlatform(new ExtensionPlatform());

class ExtensionBackground {
    app = new App(new AjaxSender(process.env.PL_SERVER_URL!));

    private _reload = debounce(() => this.app.reload(), 30000);

    async init() {
        this.app.subscribe(() => this._stateChanged());
        browser.runtime.onMessage.addListener(async (msg: Message) => {
            switch (msg.type) {
                case "loggedOut":
                case "locked":
                    await this.app.load();
                    this._updateBadge();
                    break;
                case "unlocked":
                    await this.app.load();
                    await this.app.unlockWithMasterKey(base64ToBytes(msg.masterKey));
                    this._updateBadge();
                    break;
                case "requestMasterKey":
                    return (
                        (this.app.account && this.app.account.masterKey && bytesToBase64(this.app.account.masterKey)) ||
                        null
                    );
                case "calcTOTP":
                    return totp(base32ToBytes(msg.secret));
            }
        });
        const updateBadge = debounce(() => this._updateBadge(), 100);
        browser.tabs.onUpdated.addListener(updateBadge);
        browser.tabs.onActivated.addListener(updateBadge);

        browser.contextMenus.onClicked.addListener(async ({ menuItemId }: Menus.OnClickData) => {
            const match = (menuItemId as string).match(/^item\/([^\/]+)(?:\/(\d+))?$/);

            console.log(match);

            if (!match) {
                return;
            }

            const [, id, index] = match;
            const item = this.app.getItem(id);
            if (!item) {
                return;
            }

            messageTab({
                type: "autoFill",
                item: item.item,
                index: index ? parseInt(index) : undefined
            });
        });
    }

    private async _getActiveTab() {
        const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
        return tab || null;
    }

    private async _updateBadge() {
        const tab = await this._getActiveTab();
        const count = tab && tab.url ? await this.app.state.index.matchUrl(tab.url) : [];
        browser.browserAction.setBadgeText({ text: count ? count.toString() : "" });
        browser.browserAction.setBadgeBackgroundColor({ color: "#ff6666" });

        await browser.contextMenus.removeAll();

        if (this.app.state.locked) {
            browser.contextMenus.create({
                id: "test",
                type: "normal",
                title: "Unlock to enable!",
                enabled: false,
                contexts: ["all"]
            });
        } else if (tab && tab.url) {
            const items = this.app.getItemsForUrl(tab.url);
            console.log("found items", items);
            for (const { item } of items) {
                await browser.contextMenus.create({
                    id: `item/${item.id}`,
                    title: item.name,
                    type: "normal",
                    contexts: ["all"]
                });

                for (const [index, field] of item.fields.entries()) {
                    await browser.contextMenus.create({
                        parentId: `item/${item.id}`,
                        id: `item/${item.id}/${index}`,
                        title: field.name,
                        type: "normal",
                        contexts: ["editable"]
                    });
                }
            }
        }
    }

    private _stateChanged() {
        this._reload();
        this._updateIcon();
    }

    private _updateIcon() {
        if (!this.app.account) {
            browser.browserAction.setIcon({ path: "icon-locked.png" });
            browser.browserAction.setTitle({ title: "Please Log In" });
        } else {
            browser.browserAction.setIcon({ path: "icon.png" });
            browser.browserAction.setTitle({ title: "Padloc" });
        }
    }
}

//@ts-ignore
const extension = (window.extension = new ExtensionBackground());

extension.init();
