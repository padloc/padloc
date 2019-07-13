import { App } from "@padloc/core/src/app";
import { setProvider } from "@padloc/core/src/crypto";
import { setPlatform } from "@padloc/core/src/platform";
import { WebCryptoProvider } from "./crypto";
import { Router } from "./route";
import { AjaxSender } from "./ajax";
import { WebPlatform } from "./platform";
import { LocalStorage } from "./storage";

const sender = new AjaxSender(process.env.PL_SERVER_URL!);
const stripePublicKey = process.env.PL_STRIPE_PUBLIC_KEY;
const billingConfig = stripePublicKey ? { stripePublicKey } : undefined;
export const app = (window.app = new App(new LocalStorage(), sender, billingConfig));
export const router = (window.router = new Router());

setPlatform(new WebPlatform());
setProvider(new WebCryptoProvider());
