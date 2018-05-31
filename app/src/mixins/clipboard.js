import "../elements/clipboard";

let clipboardSingleton;

export function ClipboardMixin(baseClass) {
    return class ClipboardMixin extends baseClass {
        setClipboard(record, field, duration) {
            if (!clipboardSingleton) {
                clipboardSingleton = document.createElement("pl-clipboard");
                document.body.appendChild(clipboardSingleton);
                clipboardSingleton.offsetLeft;
            }

            return clipboardSingleton.set(record, field, duration);
        }

        clearClipboard() {
            if (clipboardSingleton) {
                clipboardSingleton.clear();
            }
        }
    };
}
