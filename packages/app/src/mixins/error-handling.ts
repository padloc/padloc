import { Err, ErrorCode } from "@padloc/core/src/error";
import { translate as $l } from "@padloc/locale/src/translate";
import { composeEmail } from "@padloc/core/src/platform";
import { app, router } from "../init";
import { alert, confirm } from "../dialog";
// import { notify } from "../elements/notification";

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
                    : new Err(ErrorCode.UNKNOWN_ERROR, $l("An unexpected error occurred."), {
                          error: error instanceof Error ? error : new Error(error.toString())
                      });

            switch (error.code) {
                case ErrorCode.FAILED_CONNECTION:
                    // A failed connection is interpreted as the user simply being offline,
                    // which is indicated in another place in the UI
                    return true;
                case ErrorCode.INVALID_SESSION:
                case ErrorCode.SESSION_EXPIRED:
                    await app.logout();
                    await alert($l("Your session has expired. Please log in again!"), { preventAutoClose: true });
                    router.go("login");
                    return true;
                default:
                    const confirmed = await confirm(
                        error.message || $l("Something went wrong. Please try again later!"),
                        $l("Report Error"),
                        $l("Dismiss"),
                        { title: "Error", type: "warning", preventAutoClose: true }
                    );
                    if (confirmed) {
                        const email = process.env.PL_SUPPORT_EMAIL || "";
                        const subject = "Padloc Error Report";
                        const message = `

----- ^^^ ----- enter your comment above ----- ^^^ -----

IMPORTANT: Please verify that the message below does not contain any sensitive data before sending this email!

The following error occurred:

${error}

Device Info:

${JSON.stringify(app.state.device.toRaw(), null, 4)}
                        `;
                        composeEmail(email, subject, message);
                    }
                    return true;
            }

            return false;
        }
    };
}
