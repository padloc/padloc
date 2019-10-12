import { app } from "../globals";
import { ErrorHandling } from "./error-handling";

type Constructor<T> = new (...args: any[]) => T;

export function AutoSync<B extends Constructor<ErrorHandling>>(baseClass: B) {
    return class extends baseClass {
        constructor(...args: any[]) {
            super(...args);
            app.loaded.then(() => this.startPeriodicSync());
        }

        startPeriodicSync() {
            setTimeout(async () => {
                if (app.state.loggedIn && !app.state.locked) {
                    try {
                        await app.synchronize();
                    } catch (e) {
                        await this.handleError(e);
                    }
                }
                this.startPeriodicSync();
            }, app.settings.syncInterval * 60 * 1000);
        }
    };
}
