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
    | { type: "requestMasterKey" };
