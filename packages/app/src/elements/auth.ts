import { translate as $l } from "@padloc/locale/src/translate";
import { ErrorCode } from "@padloc/core/src/error";
import { AccountStatus, AuthPurpose } from "@padloc/core/src/auth";
import { router } from "../globals";
import { StartForm } from "./start-form";
import { Input } from "./input";
import { Button } from "./button";
import { alert } from "../lib/dialog";
import "./logo";
import { customElement, query } from "lit/decorators.js";
import { html } from "lit";
import { authenticate } from "@padloc/core/src/platform";

@customElement("pl-auth")
export class Auth extends StartForm {
    readonly routePattern = /^start/;

    @query("#emailInput")
    private _emailInput: Input;

    @query("#submitButton")
    private _submitButton: Button;

    async reset() {
        await this.updateComplete;
        this._emailInput.value = router.params.email || "";
        this._submitButton.stop();
        super.reset();
    }

    static styles = [...StartForm.styles];

    render() {
        return html`
            <div class="fullbleed centering layout">
                <form>
                    <pl-logo class="animated"></pl-logo>

                    <pl-input
                        id="emailInput"
                        type="email"
                        required
                        select-on-focus
                        .label=${$l("Email Address")}
                        class="animated"
                        @enter=${() => this._submit()}
                    >
                    </pl-input>

                    <pl-button id="submitButton" class="animated" @click=${() => this._submit()}>
                        <div class="spacing centering horizontal layout">
                            <div>${$l("Continue")}</div>
                            <pl-icon icon="arrow-right"></pl-icon>
                        </div>
                    </pl-button>
                </form>
            </div>
        `;
    }

    private async _authenticate(
        email: string,
        authenticatorIndex = 0
    ): Promise<{ token: string; accountStatus: AccountStatus; deviceTrusted: boolean } | null> {
        try {
            const res = await authenticate({
                purpose: AuthPurpose.Login,
                email: this._emailInput.value,
                authenticatorIndex,
            });
            return res;
        } catch (e: any) {
            if (e.code === ErrorCode.NOT_FOUND) {
                await alert(e.message, { title: $l("Authentication Failed"), options: [$l("Cancel")] });
                return null;
            }

            const choice = await alert(e.message, {
                title: $l("Authentication Failed"),
                options: [$l("Try Again"), $l("Try Another Method"), $l("Cancel")],
            });
            switch (choice) {
                case 0:
                    return this._authenticate(email, authenticatorIndex);
                case 1:
                    return this._authenticate(email, authenticatorIndex + 1);
                default:
                    return null;
            }
        }
    }

    private async _submit(): Promise<void> {
        if (this._submitButton.state === "loading") {
            return;
        }

        if (!this._emailInput.reportValidity()) {
            return;
        }

        const email = this._emailInput.value;

        this._emailInput.blur();

        if (this._emailInput.invalid) {
            alert($l("Please enter a valid email address!"));
            this.rumble();
            this._emailInput.focus();
            return;
        }

        this._submitButton.start();

        const authRes = await this._authenticate(email);

        if (!authRes) {
            this._submitButton.fail();
            return;
        }

        this._submitButton.success();

        console.log(authRes);

        router.go(authRes.accountStatus === AccountStatus.Active ? "login" : "signup", {
            email,
            authToken: authRes.token,
            deviceTrusted: authRes.deviceTrusted.toString(),
        });
    }
}
