import { App } from "@padloc/core/lib/app.js";
import { setProvider } from "@padloc/core/lib/crypto.js";
import { setPlatform } from "@padloc/core/lib/platform.js";
import { WebCryptoProvider } from "./crypto.js";
import { Router } from "./route.js";
import { AjaxSender } from "./ajax.js";
import { WebPlatform } from "./platform.js";
import { LocalStorage } from "./storage.js";

const sender = new AjaxSender(window.env.serverUrl);
export const app = (window.app = new App(new LocalStorage(), sender));
export const router = (window.router = new Router());

setPlatform(new WebPlatform());
setProvider(new WebCryptoProvider());
