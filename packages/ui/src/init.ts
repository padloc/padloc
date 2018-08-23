import { App } from "@padlock/core/lib/app.js";
import { setProvider } from "@padlock/core/lib/crypto.js";
import WebCryptoProvider from "@padlock/core/lib/webcrypto-provider.js";
import { Router } from "./route.js";

setProvider(new WebCryptoProvider());
export const app = (window.app = new App());
export const router = (window.router = new Router());
