import { Platform } from "@padloc/core/src/platform";
import { WebPlatform } from "@padloc/app/src/platform";

export class ElectronPlatform extends WebPlatform implements Platform {}
