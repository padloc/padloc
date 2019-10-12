import { Platform } from "@padloc/core/src/platform";
import { WebPlatform } from "@padloc/app/src/lib/platform";

export class ElectronPlatform extends WebPlatform implements Platform {}
