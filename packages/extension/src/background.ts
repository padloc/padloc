import { browser } from "webextension-polyfill-ts";
import { setPlatform } from "@padloc/core/src/platform";
import { App } from "@padloc/core/src/app";
import { bytesToBase64, base64ToBytes, base32ToBytes } from "@padloc/core/src/encoding";
import { AjaxSender } from "@padloc/app/src/lib/ajax";
import { totp } from "@padloc/core/src/otp";
import { ExtensionPlatform } from "./platform";
import { Message } from "./message";

setPlatform(new ExtensionPlatform());

class ExtensionBackground {
    app = new App(new AjaxSender(process.env.PL_SERVER_URL!));

    async init() {
        this.app.subscribe(() => this._stateChanged());
        browser.runtime.onMessage.addListener(async (msg: Message) => {
            switch(msg.type) {
                case "loggedOut":
                case "locked":
                    this.app.load();
                    break;
                case "unlocked":
                    await this.app.load();
                    this.app.unlockWithMasterKey(base64ToBytes(msg.masterKey));
                    break;
                case "requestMasterKey":
                    return this.app.account && this.app.account.masterKey && bytesToBase64(this.app.account.masterKey) || null;
                case "calcTOTP":
                    return totp(base32ToBytes(msg.secret));
            }
        });
    }

    private _stateChanged() {
        console.log("state changed!");
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

// browser.runtime.onMessage.addListener((msg: any) => console.log("meessage receiveed!", msg));
// browser.browserAction.setBadgeText({ text: "1" });
// browser.browserAction.setBadgeBackgroundColor({ color: "#ff6666" });
// browser.browserAction.setBadgeTextColor({ color: "#ffffff" });
//
// browser.notifications.create({
//     type: "basic",
//     title: "Please log in",
//     message: "Please Log Into Your Padloc Account to use this Extension!",
//     // @ts-ignore
//     buttons: [{ title: "Log In" }]
// });
//
// chrome.runtime.onInstalled.addListener(function() {
//     chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
//         chrome.declarativeContent.onPageChanged.addRules([
//             {
//                 conditions: [
//                     new chrome.declarativeContent.PageStateMatcher({
//                         pageUrl: { hostEquals: "developer.chrome.com" }
//                     })
//                 ],
//                 actions: [new chrome.declarativeContent.ShowPageAction()]
//             }
//         ]);
//     });
// });
