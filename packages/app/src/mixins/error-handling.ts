import { Err, ErrorCode } from "@padloc/core/src/error";
import { translate as $l } from "@padloc/locale/src/translate";
import { app, router } from "../globals";
import { alert } from "../lib/dialog";

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

                // These are expected to occur during a user lifecycle and can be ingored.
                case ErrorCode.ACCOUNT_EXISTS:
                case ErrorCode.EMAIL_VERIFICATION_REQUIRED:
                case ErrorCode.EMAIL_VERIFICATION_FAILED:
                case ErrorCode.EMAIL_VERIFICATION_TRIES_EXCEEDED:
                case ErrorCode.ORG_FROZEN:
                case ErrorCode.ORG_QUOTA_EXCEEDED:
                case ErrorCode.MEMBER_QUOTA_EXCEEDED:
                case ErrorCode.GROUP_QUOTA_EXCEEDED:
                case ErrorCode.VAULT_QUOTA_EXCEEDED:
                case ErrorCode.STORAGE_QUOTA_EXCEEDED:
                case ErrorCode.BILLING_ERROR:
                    return true;

                default:
                    app.state._errors.push(error);
                    app.publish();
            }

            return false;
        }
    };
}
