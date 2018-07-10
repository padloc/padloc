import "reflect-metadata";
import { App } from "@padlock/core/lib/app.js";
import { setProvider } from "@padlock/core/lib/crypto.js";
import WebCryptoProvider from "@padlock/core/lib/webcrypto-provider.js";

setProvider(WebCryptoProvider);
export const app = new App();
