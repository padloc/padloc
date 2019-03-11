import { localize as $l } from "@padloc/core/lib/locale.js";
import { BaseElement } from "./elements/base.js";
import "./elements/generator.js";
import "./elements/alert-dialog.js";
import "./elements/prompt-dialog.js";
import "./elements/export-dialog.js";
import { AlertDialog, AlertOptions } from "./elements/alert-dialog.js";
import { PromptDialog, PromptOptions } from "./elements/prompt-dialog.js";
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
    options = options || {};
    options.message = message;
    return instant
        ? getDialog("pl-alert-dialog").show(options)
        : lineUpDialog("pl-alert-dialog", (dialog: AlertDialog) => dialog.show(options));
}

export function confirm(
    message: string,
    confirmLabel = $l("Confirm"),
    cancelLabel = $l("Cancel"),
    options: any = {},
    instant?: boolean
) {
    options.options = [confirmLabel, cancelLabel];
    options.type = options.type || "question";
    options.horizontal = typeof options.horizontal !== "undefined" ? options.horizontal : true;
    return alert(message, options, instant).then(choice => choice === 0);
}

export function prompt(message: string, opts: PromptOptions = {}, instant = false) {
    opts.message = message;
    return instant
        ? getDialog("pl-prompt-dialog").show(opts)
        : lineUpDialog("pl-prompt-dialog", (dialog: PromptDialog) => dialog.show(opts));
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
    return lineUpDialog("pl-generator", dialog => dialog.show());
}

export function clearDialogs() {
    if (currentDialog) {
        currentDialog.open = false;
    }
    lastDialogPromise = Promise.resolve();
}

export function dialog(name: string) {
    return (prototype: BaseElement, propertyName: string) => {
        Object.defineProperty(prototype, propertyName, {
            get() {
                return getDialog(name);
            },
            enumerable: true,
            configurable: true
        });
    };
}
