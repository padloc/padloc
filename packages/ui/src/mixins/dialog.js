import { localize as $l } from "@padlock/core/lib/locale";
import "../elements/generator.js";
import "../elements/dialog-alert.js";
import "../elements/dialog-confirm.js";
import "../elements/dialog-prompt.js";
import "../elements/dialog-options.js";

const dialogElements = {};

let lastDialogPromise = Promise.resolve();
let currentDialog;

export function DialogMixin(superClass) {
    return class DialogMixin extends superClass {
        getDialog(elName) {
            let el = dialogElements[elName];

            if (!el) {
                dialogElements[elName] = el = document.createElement(elName);
                document.body.appendChild(el);
            }

            return el;
        }

        lineUpDialog(dialog, fn) {
            dialog = typeof dialog === "string" ? this.getDialog(dialog) : dialog;
            const promise = lastDialogPromise.then(() => {
                currentDialog = dialog;
                return fn(dialog);
            });

            lastDialogPromise = promise;

            return promise;
        }

        alert(message, options) {
            return this.lineUpDialog("pl-dialog-alert", dialog => dialog.show(message, options));
        }

        confirm(message, confirmLabel = $l("Confirm"), cancelLabel = $l("Cancel"), options = { type: "question" }) {
            options.options = [confirmLabel, cancelLabel];
            return this.alert(message, options).then(choice => choice === 0);
        }

        prompt(message, placeholder, type, confirmLabel, cancelLabel, preventDismiss, verify) {
            return this.lineUpDialog("pl-dialog-prompt", dialog => {
                return dialog.prompt(message, placeholder, type, confirmLabel, cancelLabel, preventDismiss, verify);
            });
        }

        choose(message, options, opts = { preventDismiss: true, type: "question" }) {
            opts.options = options;
            return this.alert(message, opts);
        }

        generate() {
            return this.lineUpDialog("pl-generator", dialog => dialog.generate());
        }

        getSingleton(elName) {
            return this.getDialog(elName);
        }

        clearDialogs() {
            if (currentDialog) {
                currentDialog.open = false;
            }
            lastDialogPromise = Promise.resolve();
        }

        promptPassword(password, msg, confirmLabel, cancelLabel) {
            return this.prompt(msg, $l("Enter Password"), "password", confirmLabel, cancelLabel, true, pwd => {
                if (!pwd) {
                    return Promise.reject($l("Please enter a password!"));
                } else if (pwd !== password) {
                    return Promise.reject($l("Wrong password. Please try again!"));
                } else {
                    return Promise.resolve(true);
                }
            });
        }

        promptForgotPassword() {
            return this.confirm(
                $l(
                    "For security reasons don't keep a record of your master password so unfortunately we cannot " +
                        "help you recover it. You can reset your password, but your data will be lost in the process!"
                ),
                $l("Reset Password"),
                $l("Keep Trying"),
                { hideIcon: true, title: $l("Forgot Your Password?") }
            ).then(confirmed => {
                return (
                    confirmed &&
                    this.confirm(
                        $l("Are you sure you want to reset your password? " + "WARNING: All your data will be lost!"),
                        $l("Reset Password"),
                        $l("Cancel"),
                        { type: "warning" }
                    )
                );
            });
        }
    };
}
