import { App } from "@padlock/core/lib/app.js";
import { setProvider } from "@padlock/core/lib/crypto.js";
import { setPlatform } from "@padlock/core/lib/platform.js";
import { WebCryptoProvider } from "./crypto.js";
import { Router } from "./route.js";
import { AjaxSender } from "./ajax.js";
import { WebPlatform } from "./platform.js";

const sender = new AjaxSender(window.env.serverUrl);
export const app = (window.app = new App(sender));
export const router = (window.router = new Router());

setPlatform(new WebPlatform());
setProvider(new WebCryptoProvider());
