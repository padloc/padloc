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
        const provisioning = app.getOrgProvisioning(org);

        // Create first vault and group
        if (provisioning?.orgQuota.groups !== 0) {
            const everyone = await app.createGroup(org, "Everyone", [{ id: app.account!.id }], []);
            await app.createVault("Main", org, [], [{ name: everyone.name, readonly: false }]);
        } else {
            await app.createVault("Main", org, [{ id: app.account!.id, readonly: false }]);
        }

        this._submitButton.success();
        this.done(org);
    }

    static styles = [
        ...Dialog.styles,
        css`
            .plan {
                text-align: center;
                padding: 1em;
                background: var(--color-highlight);
                color: var(--color-highlight-text);
                display: flex;
                flex-direction: column;
                position: relative;
            }

            .plan-name {
                font-size: 1.7rem;
                margin-bottom: var(--spacing);
                font-weight: bold;
            }

            .plan-trial {
                font-size: 1.2rem;
                margin-bottom: var(--spacing);
            }

            .plan-then {
                font-size: var(--font-size-tiny);
                margin-bottom: var(--spacing);
            }

            .plan-price {
                letter-spacing: 0.1em;
                display: flex;
                align-items: flex-start;
                justify-content: center;
                font-weight: bold;
                font-size: 1rem;
                margin: 5px;
            }

            .plan-price-currency {
                line-height: 1em;
                margin-top: 0.4em;
            }

            .plan-price-dollars {
                font-size: 3em;
                line-height: 1em;
            }

            .plan-price-cents {
                font-size: 1.5em;
                line-height: 1em;
                margin-top: 0.2em;
            }

            .plan-unit {
                font-size: var(--font-size-small);
            }

            .plan-fineprint {
                font-size: var(--font-size-tiny);
                opacity: 0.7;
                margin: 4px 0 -4px 0;
            }

            pl-button.primary {
                --button-background: var(--color-highlight);
                --button-foreground: var(--color-highlight-text);
            }

            .quantity-wrapper {
                display: flex;
                align-items: center;
                justify-content: center;
                margin: var(--spacing);
            }

            .quantity-label {
                font-weight: bold;
                padding: 12px;
                font-size: 1.2em;
                text-align: left;
            }

            .quantity-input {
                width: 3em;
                margin: 0;
                font-weight: bold;
                font-size: 1.5rem;
            }

            .quantity-minmax {
                font-size: var(--font-size-micro);
                opacity: 0.5;
                text-align: right;
                padding: 12px;
            }
        `,
    ];

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
