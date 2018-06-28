import { localize as $l } from "@padlock/core/lib/locale.js";
import { wait } from "@padlock/core/lib/util.js";

export function MessagesMixin(superClass) {
    return class MessagesMixin extends superClass {
        constructor() {
            super();
            this.listen("data-loaded", () => this.checkMessages());
        }

        async checkMessages() {
            await wait(1000);
            const messages = await this.app.meta.messages.fetch();
            messages.forEach(m => this._displayMessage(m));
        }

        _displayMessage(m) {
            if (m.link) {
                this.confirm(m.text, $l("Learn More"), $l("Dismiss"), { type: "info" }).then(confirmed => {
                    if (confirmed) {
                        window.open(m.link, "_system");
                    }
                    this._messages.markRead(m);
                });
            } else {
                this.alert(m.text).then(() => this._messages.markRead(m));
            }
        }
    };
}
