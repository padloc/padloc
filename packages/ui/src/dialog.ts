import { localize as $l } from "@padlock/core/lib/locale";
import "./elements/generator.js";
import "./elements/dialog-alert.js";
import "./elements/dialog-confirm.js";
import "./elements/dialog-prompt.js";
import "./elements/dialog-options.js";

const dialogElements = {};

let lastDialogPromise = Promise.resolve();
let currentDialog: any;

export function getDialog(elName: string) {
    let el = dialogElements[elName];

    if (!el) {
        dialogElements[elName] = el = document.createElement(elName);
        document.body.appendChild(el);
    }

    return el as any;
}

export function lineUpDialog(d: string | any, fn: (d: any) => Promise<any>): Promise<any> {
    const dialog = typeof d === "string" ? getDialog(d) : d;
    const promise = lastDialogPromise.then(() => {
        currentDialog = dialog;
        return fn(dialog);
    });

    lastDialogPromise = promise;

    return promise;
}

export function alert(message: string, options: any): Promise<number> {
    return lineUpDialog("pl-dialog-alert", dialog => dialog.show(message, options));
}

export function confirm(message: string, confirmLabel = $l("Confirm"), cancelLabel = $l("Cancel"), options: any = {}) {
    options.options = [confirmLabel, cancelLabel];
    return alert(message, options).then(choice => choice === 0);
}

export function prompt(
    message: string,
    placeholder: string,
    type?: string,
    confirmLabel?: string,
    cancelLabel?: string | false,
    preventDismiss?: boolean,
    verify?: (val: string) => Promise<string>
) {
    return lineUpDialog("pl-dialog-prompt", dialog => {
        return dialog.prompt(message, placeholder, type, confirmLabel, cancelLabel, preventDismiss, verify);
    });
}

export function choose(
    message: string,
    options: string[],
    opts: { preventDismiss?: boolean; type?: string; options?: string[] } = { preventDismiss: true, type: "question" }
): Promise<number> {
    opts.options = options;
    return alert(message, opts);
}

export function generate() {
    return lineUpDialog("pl-generator", dialog => dialog.generate());
}

export function clearDialogs() {
    if (currentDialog) {
        currentDialog.open = false;
    }
    lastDialogPromise = Promise.resolve();
}

export function promptPassword(password: string, msg: string, confirmLabel?: string, cancelLabel?: string) {
    return prompt(msg, $l("Enter Password"), "password", confirmLabel, cancelLabel, true, (pwd: string) => {
        if (!pwd) {
            return Promise.reject($l("Please enter a password!"));
        } else if (pwd !== password) {
            return Promise.reject($l("Wrong password. Please try again!"));
        } else {
            return Promise.resolve(pwd);
        }
    });
}

export function promptForgotPassword() {
    return confirm(
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
            confirm(
                $l("Are you sure you want to reset your password? " + "WARNING: All your data will be lost!"),
                $l("Reset Password"),
                $l("Cancel"),
                { type: "warning" }
            )
        );
    });
}
