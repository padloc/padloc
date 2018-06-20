import { localize as $l } from "@padlock/core/lib/locale.js";
import { wait } from "@padlock/core/lib/util.js";
import { Messages } from "@padlock/core/lib/messages.js";
import { FileSource } from "@padlock/core/lib/source.js";

export function MessagesMixin(superClass) {
    return class MessagesMixin extends superClass {
        ready() {
            super.ready();
            this._messages = new Messages(
                "https://padlock.io/messages.json",
                new FileSource("read-messages.json"),
                this.settings
            );
            this.listen("data-loaded", () => this.checkMessages());
        }

        checkMessages() {
            wait(1000)
                .then(() => this._messages.fetch())
                .then(aa => aa.forEach(a => this._displayMessage(a)));
        }

        _displayMessage(a) {
            if (a.link) {
                this.confirm(a.text, $l("Learn More"), $l("Dismiss"), { type: "info" }).then(confirmed => {
                    if (confirmed) {
                        window.open(a.link, "_system");
                    }
                    this._messages.markRead(a);
                });
            } else {
                this.alert(a.text).then(() => this._messages.markRead(a));
            }
        }
    };
}
