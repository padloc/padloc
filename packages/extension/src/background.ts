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

    // private _currentItemIndex = -1;

    private _reload = debounce(() => this.app.reload(), 30000);

    async init() {
        this.app.subscribe(() => this._stateChanged());
        browser.runtime.onMessage.addListener(async (msg: Message) => {
            switch (msg.type) {
                case "loggedOut":
                case "locked":
                    await this.app.load();
                    this._update();
                    break;
                case "unlocked":
                    await this.app.load();
                    await this.app.unlockWithMasterKey(base64ToBytes(msg.masterKey));
                    this._update();
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
        const updateBadge = debounce(() => this._update(), 100);
        browser.tabs.onUpdated.addListener(updateBadge);
        browser.tabs.onActivated.addListener(updateBadge);

        browser.contextMenus.onClicked.addListener(({ menuItemId }: Menus.OnClickData) =>
            this._contextMenuClicked(menuItemId as string)
        );

        // browser.commands.onCommand.addListener(command => this._executeCommand(command));
    }

    private async _getActiveTab() {
        const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
        return tab || null;
    }

    private async _contextMenuClicked(menuItemId: string) {
        if (menuItemId === "openPopup") {
            browser.browserAction.openPopup();
            return;
        }

        const match = menuItemId.match(/^item\/([^\/]+)(?:\/(\d+))?$/);

        if (!match) {
            return;
        }

        const [, id, ind] = match;
        const item = this.app.getItem(id);
        const index = parseInt(ind);
        if (!item || isNaN(index)) {
            return;
        }

        const field = item.item.fields[index];
        const value = field.type === "totp" ? await totp(base32ToBytes(field.value)) : field.value;
        await messageTab({
            type: "fillActive",
            value
        });

        // this._openItem(item.item, index ? parseInt(index) : undefined);
    }

    // private _openItem(item: VaultItem, index?: number) {
    //     messageTab({
    //         type: "autoFill",
    //         item,
    //         index
    //     });
    // }

    // private async _executeCommand(command: string) {
    //     const items = await this._getItemsForTab();
    //
    //     switch (command) {
    //         case "open-next":
    //             this._currentItemIndex = (this._currentItemIndex + 1) % items.length;
    //             if (items[this._currentItemIndex]) {
    //                 this._openItem(items[this._currentItemIndex].item);
    //             }
    //             break;
    //         case "open-previous":
    //             this._currentItemIndex = (this._currentItemIndex + items.length - 1) % items.length;
    //             if (items[this._currentItemIndex]) {
    //                 this._openItem(items[this._currentItemIndex].item);
    //             }
    //             break;
    //     }
    // }

    private async _updateBadge() {
        const count = await this._getCountForTab();
        browser.browserAction.setBadgeText({ text: count ? count.toString() : "" });
        browser.browserAction.setBadgeBackgroundColor({ color: "#ff6666" });
    }

    private async _getItemsForTab() {
        const tab = await this._getActiveTab();
        return tab && tab.url ? this.app.getItemsForUrl(tab.url) : [];
    }

    private async _getCountForTab() {
        const tab = await this._getActiveTab();
        return tab && tab.url ? await this.app.state.index.matchUrl(tab.url) : 0;
    }

    private async _updateContextMenu() {
        await browser.contextMenus.removeAll();

        const openPopupAvailable = typeof browser.browserAction.openPopup === "function";
        const count = await this._getCountForTab();

        if (!count || !this.app.state.loggedIn) {
            return;
        }

        if (this.app.state.locked) {
            browser.contextMenus.create({
                id: "openPopup",
                title: `${count > 1 ? `${count} items` : "1 item" } found${!openPopupAvailable ? " (unlock to view)" : ""}`,
                enabled: openPopupAvailable,
                contexts: ["editable"]
            });
        } else {
            const items = await this._getItemsForTab();
            for (const { item } of items) {
                await browser.contextMenus.create({
                    id: `item/${item.id}`,
                    title: item.name,
                    contexts: ["editable"]
                });

                for (const [index, field] of item.fields.entries()) {
                    await browser.contextMenus.create({
                        parentId: `item/${item.id}`,
                        id: `item/${item.id}/${index}`,
                        title: field.name,
                        contexts: ["editable"]
                    });
                }
            }
        }
    }

    private async _update() {
        this._updateBadge();
        this._updateContextMenu();
        // this._currentItemIndex = -1;
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
