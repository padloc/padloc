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

        private _currentErrorHandling: Promise<boolean> = Promise.resolve(false);

        async handleError(error: any) {
            await this._currentErrorHandling;
            this._currentErrorHandling = this._handleError(error);
            return this._currentErrorHandling;
        }

        async _handleError(error: any) {
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
                    if (!!app.session) {
                        await alert($l("Your session has expired. Please log in again!"), { preventAutoClose: true });
                        await app.logout();
                        router.go("login");
                        return true;
                    } else {
                        return false;
                    }

                // These are expected to occur during a user lifecycle and can be ingored.
                case ErrorCode.ACCOUNT_EXISTS:
                case ErrorCode.AUTHENTICATION_REQUIRED:
                case ErrorCode.AUTHENTICATION_FAILED:
                case ErrorCode.AUTHENTICATION_TRIES_EXCEEDED:
                case ErrorCode.ORG_FROZEN:
                case ErrorCode.ORG_QUOTA_EXCEEDED:
                case ErrorCode.MEMBER_QUOTA_EXCEEDED:
                case ErrorCode.GROUP_QUOTA_EXCEEDED:
                case ErrorCode.VAULT_QUOTA_EXCEEDED:
                case ErrorCode.STORAGE_QUOTA_EXCEEDED:
                case ErrorCode.BILLING_ERROR:
                case ErrorCode.OUTDATED_REVISION:
                case ErrorCode.MISSING_ACCESS:
                case ErrorCode.INVALID_CREDENTIALS:
                    return true;

                case ErrorCode.UNSUPPORTED_VERSION:
                    await alert(
                        error.message ||
                            $l(
                                "Some data associated with your account was saved with a newer version of " +
                                    "Padloc and cannot be decoded. Please install the latest version Padloc!"
                            ),
                        { title: $l("Update Required"), type: "warning" }
                    );

                default:
                    app.state._errors.push(error);
                    app.publish();
            }

            return false;
        }
    };
}
