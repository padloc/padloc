import { App } from "@padloc/core/src/app";
import { Router } from "./lib/route";
import { AjaxSender } from "./lib/ajax";
import { LocalStorage } from "./lib/storage";

const sender = new AjaxSender(process.env.PL_SERVER_URL!);
const billingEnabled = process.env.PL_BILLING_ENABLED === "true";
const disablePayment = process.env.PL_BILLING_DISABLE_PAYMENT === "true";
const stripePublicKey = process.env.PL_BILLING_STRIPE_PUBLIC_KEY || "";

if (billingEnabled && !disablePayment && !stripePublicKey) {
    throw "Billing enabled but no stripe public key provided!";
}

const billingConfig = billingEnabled
    ? {
          disablePayment,
          stripePublicKey
      }
    : undefined;
export const app = (window.app = new App(new LocalStorage(), sender, billingConfig));
export const router = (window.router = new Router());
