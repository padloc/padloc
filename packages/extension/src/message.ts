import { VaultItem } from "@padloc/core/src/item";

export type Message =
    | {
          type: "loggedIn";
      }
    | {
          type: "loggedOut";
      }
    | {
          type: "locked";
      }
    | {
          type: "unlocked";
          masterKey: string;
      }
    | { type: "requestMasterKey" }
    | { type: "autoFill"; item: VaultItem; index: number }
    | { type: "calcTOTP"; secret: string }
    | { type: "isContentReady" };
