import { translate as $l } from "@padloc/locale/src/translate";
import { Org } from "@padloc/core/src/org";
import { app } from "../globals";
import { Dialog } from "./dialog";
import { Button } from "./button";
import { Input } from "./input";
import "./scroller";
import { customElement, query, state } from "lit/decorators.js";
import { css, html } from "lit";

@customElement("pl-create-org-dialog")
export class CreateOrgDialog extends Dialog<void, Org> {
    @state()
    private _error = "";

    @state()
    private _org: Org | null = null;

    @query("#nameInput")
    private _nameInput: Input;

    @query("#submitButton")
    private _submitButton: Button;

    async show() {
        this._org = null;
        this._error = "";
        return super.show();
    }

    private async _submit() {
        if (this._submitButton.state === "loading") {
            return;
        }

        const name = this._nameInput.value;

        if (!name) {
            this._error = $l("Please enter an organization name!");
            return;
        }

        this._error = "";
        this._submitButton.start();

        if (!this._org) {
            try {
                this._org = await app.createOrg(name);
            } catch (e) {
                this._error = e.message || $l("Something went wrong. Please try again later!");
                this._submitButton.fail();
                return;
            }
        }

        const org = (this._org = app.getOrg(this._org.id)!);
        // const provisioning = app.getOrgProvisioning(org);

        // // Create first vault and group
        // if (provisioning?.quota.groups !== 0) {
        //     const everyone = await app.createGroup(org, "Everyone", [{ email: app.account!.id }], []);
        //     await app.createVault("Main", org, [], [{ name: everyone.name, readonly: false }]);
        // } else {
        //     await app.createVault("Main", org, [
        //         { email: app.account!.email, accountId: app.account!.id, readonly: false },
        //     ]);
        // }

        this._submitButton.success();
        this.done(org);
    }

    static styles = [...Dialog.styles, css``];

    renderContent() {
        return html`
            <header class="half-padded center-aligning horizontal layout">
                <div class="large padded stretch">${$l("Create Organization")}</div>
                <pl-button class="transparent slim" @click=${this.dismiss}>
                    <pl-icon icon="cancel"></pl-icon>
                </pl-button>
            </header>

            <pl-scroller class="stretch">
                <div class="padded spacing vertical layout">
                    <pl-input
                        id="nameInput"
                        class="item"
                        .label=${$l("Organization Name")}
                        .value=${(this._org && this._org.name) || ""}
                    ></pl-input>

                    <div class="padded text-centering red card" ?hidden="${!this._error}">${this._error}</div>

                    <pl-button id="submitButton" class="tap primary" @click=${this._submit}>
                        ${$l("Create")}
                    </pl-button>
                </div>
            </pl-scroller>
        `;
    }
}
