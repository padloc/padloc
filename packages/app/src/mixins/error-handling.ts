import { Err, ErrorCode } from "@padloc/core/lib/error.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { app, router } from "../init.js";
import { alert, confirm } from "../dialog.js";
import { notify } from "../elements/notification.js";

type Constructor<T> = new (...args: any[]) => T;

export interface ErrorHandling {
    handleError(error: any): Promise<boolean>;
}

export function ErrorHandling<B extends Constructor<Object>>(baseClass: B) {
    return class extends baseClass implements ErrorHandling {
        constructor(...args: any[]) {
            super(...args);
            window.addEventListener("error", (e: ErrorEvent) => this.handleError(e.error));
            window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => this.handleError(e.reason));
        }

        async handleError(error: any) {
            error =
                error instanceof Err
                    ? error
                    : error instanceof Error
                    ? new Err(ErrorCode.UNKNOWN_ERROR, error.message, { error })
                    : new Err(ErrorCode.UNKNOWN_ERROR, error.toString());

            switch (error.code) {
                case ErrorCode.INVALID_SESSION:
                case ErrorCode.SESSION_EXPIRED:
                    await app.logout();
                    await alert($l("Your session has expired. Please log in again!"));
                    router.go("login");
                    return true;
                case ErrorCode.RATE_LIMIT_EXCEEDED:
                    await alert($l("It seems are servers are over capacity right now. Please try again later!"), {
                        type: "warning"
                    });
                    return true;
                case ErrorCode.FAILED_CONNECTION:
                    notify($l("Looks like you're offline right now. Please check your internet connection!"), {
                        type: "warning",
                        duration: 5000
                    });
                    return true;
                case ErrorCode.INSUFFICIENT_PERMISSIONS:
                    alert($l("You don't have sufficient permissions to perform this action!"), {
                        type: "warning"
                    });
                    return true;
                case ErrorCode.SERVER_ERROR:
                    await confirm(
                        error.message ||
                            $l("Something went wrong while connecting to our servers. Please try again later!"),
                        $l("Contact Support"),
                        $l("Dismiss"),
                        { type: "warning" }
                    ).then(confirmed => {
                        if (confirmed) {
                            window.open(`mailto:support@padloc.io?subject=Server+Error+(${error.code})`);
                        }
                    });
                    return true;
            }

            return false;
        }
    };
}
