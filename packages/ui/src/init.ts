import { App } from "@padlock/core/lib/app.js";
import { setProvider } from "@padlock/core/lib/crypto.js";
import WebCryptoProvider from "@padlock/core/lib/webcrypto-provider.js";
// import { getDesktopSettings } from "@padlock/core/lib/platform.js";

setProvider(WebCryptoProvider);
export const app = (window.app = new App());
