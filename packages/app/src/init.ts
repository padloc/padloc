import { App } from "@padloc/core/src/app";
import { Router } from "./route";
import { AjaxSender } from "./ajax";
import { LocalStorage } from "./storage";

const sender = new AjaxSender(process.env.PL_SERVER_URL!);
const stripePublicKey = process.env.PL_STRIPE_PUBLIC_KEY;
const billingConfig = stripePublicKey ? { stripePublicKey } : undefined;
export const app = (window.app = new App(new LocalStorage(), sender, billingConfig));
export const router = (window.router = new Router());
