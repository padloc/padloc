declare interface Window {
  customElements: CustomElementRegistry;
  requestFileSystem: any;
  webkitRequestFileSystem: any;
  PERSISTENT: number;
  isCordova: boolean;
}

declare interface Navigator {
    persistentStorage: any;
    webkitPersistentStorage: any;
}

declare class CustomElementRegistry {
  define(name: string, definition: {prototype: any}): void;
}
