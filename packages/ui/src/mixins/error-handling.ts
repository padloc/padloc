import { Err, ErrorCode } from "@padlock/core/lib/error.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { app } from "../init.js";
import { alert, confirm } from "../dialog.js";
import { notify } from "../elements/notification.js";

type Constructor<T> = new (...args: any[]) => T;

export function ErrorHandling<B extends Constructor<Object>>(baseClass: B) {
    return class extends baseClass {
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
                        ? new Err(ErrorCode.UNKNOWN_ERROR, error.message, { originalError: error })
                        : new Err(ErrorCode.UNKNOWN_ERROR, error.toString());

            switch (error.code) {
                case ErrorCode.INVALID_SESSION:
                case ErrorCode.SESSION_EXPIRED:
                    await app.logout();
                    alert($l("You've been logged out of your Padlock online account. Please login in again!"));
                    break;
                case ErrorCode.DEPRECATED_API_VERSION:
                    const confirmed = await confirm(
                        $l(
                            "A newer version of Padlock is available now! Update now to keep using " +
                                "online features (you won't be able to sync with your account until then)!"
                        ),
                        $l("Update Now"),
                        $l("Cancel"),
                        { type: "info" }
                    );

                    if (confirmed) {
                        // checkForUpdates();
                        window.open("https://padlock.io/downloads/", "_blank");
                    }
                    break;
                case ErrorCode.RATE_LIMIT_EXCEEDED:
                    alert($l("It seems are servers are over capacity right now. Please try again later!"), {
                        type: "warning"
                    });
                    break;
                case ErrorCode.FAILED_CONNECTION:
                    notify($l("Looks like you're offline right now. Please check your internet connection!"), {
                        type: "warning",
                        duration: 5000
                    });
                    break;
                case ErrorCode.SERVER_ERROR:
                    confirm(
                        error.message ||
                            $l("Something went wrong while connecting to our servers. Please try again later!"),
                        $l("Contact Support"),
                        $l("Dismiss"),
                        { type: "warning" }
                    ).then(confirmed => {
                        if (confirmed) {
                            window.open(`mailto:support@padlock.io?subject=Server+Error+(${error.code})`);
                        }
                    });
                    break;
            }
        }
    };
}
