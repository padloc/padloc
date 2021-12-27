import { Platform } from "@padloc/core/src/platform";
import { WebPlatform } from "@padloc/app/src/lib/platform";
// import { MemoryStorage } from "@padloc/core/src/storage";

export class TauriPlatform extends WebPlatform implements Platform {
    // storage = new MemoryStorage();
}
