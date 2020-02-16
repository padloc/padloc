import { WebPlatform } from "@padloc/app/src/lib/platform";
import { ExtensionStorage } from "./storage";

export class ExtensionPlatform extends WebPlatform {
    storage = new ExtensionStorage();
}
