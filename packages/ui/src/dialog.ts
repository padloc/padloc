import { localize as $l } from "@padlock/core/lib/locale.js";
import { Record, Field } from "@padlock/core/lib/data.js";
import "./elements/generator.js";
import "./elements/alert-dialog.js";
import "./elements/prompt-dialog.js";
import "./elements/export-dialog.js";
import "./elements/field-dialog.js";
import { AlertDialog, AlertOptions } from "./elements/alert-dialog.js";
import { PromptDialog, PromptOptions } from "./elements/prompt-dialog.js";
import { ExportDialog } from "./elements/export-dialog.js";
import { FieldDialog, FieldDialogResult } from "./elements/field-dialog.js";
import { getSingleton } from "./singleton.js";

let lastDialogPromise = Promise.resolve();
let currentDialog: any;

export const getDialog = getSingleton;

export function lineUpDialog(d: string | any, fn: (d: any) => Promise<any>): Promise<any> {
    const dialog = typeof d === "string" ? getSingleton(d) : d;
    const promise = lastDialogPromise.then(() => {
        currentDialog = dialog;
        return fn(dialog);
    });

    lastDialogPromise = promise;

    return promise;
}

export function alert(message: string, options?: AlertOptions, instant = false): Promise<number> {
    return instant
        ? getDialog("pl-alert-dialog").show(message, options)
        : lineUpDialog("pl-alert-dialog", (dialog: AlertDialog) => dialog.show(message, options));
}

export function confirm(
    message: string,
    confirmLabel = $l("Confirm"),
    cancelLabel = $l("Cancel"),
    options: any = {},
    instant?: boolean
) {
    options.options = [confirmLabel, cancelLabel];
    return alert(message, options, instant).then(choice => choice === 0);
}

export function prompt(message: string, opts: PromptOptions, instant = false) {
    return instant
        ? getDialog("pl-prompt-dialog").show(message, opts)
        : lineUpDialog("pl-prompt-dialog", (dialog: PromptDialog) => dialog.show(message, opts));
}

export function choose(
    message: string,
    options: string[],
    opts: AlertOptions = {
        preventDismiss: true,
        type: "question"
    }
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
    return prompt(msg, {
        placeholder: $l("Enter Password"),
        type: "password",
        confirmLabel,
        cancelLabel,
        preventDismiss: true,
        validate: async (pwd: string) => {
            if (!pwd) {
                throw $l("Please enter a password!");
            }

            if (pwd !== password) {
                throw $l("Wrong password. Please try again!");
            }

            return pwd;
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

export function exportRecords(records: Record[]) {
    const dialog = getSingleton("pl-export-dialog") as ExportDialog;
    dialog.show(records);
}

export async function openField(field: Field, edit = false, presets = {}) {
    const result = (await lineUpDialog("pl-field-dialog", (d: FieldDialog) =>
        d.openField(field, edit, presets)
    )) as FieldDialogResult;
    return result;
}
