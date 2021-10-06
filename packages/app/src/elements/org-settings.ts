import "./scroller";
import { translate as $l } from "@padloc/locale/src/translate";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { alert, prompt, confirm } from "../lib/dialog";
import { app } from "../globals";
import { shared } from "../styles";
import { Button } from "./button";
import "./list";
import "./icon";
import "./org-nav";
import { customElement, property, query } from "lit/decorators.js";
import { html, LitElement } from "lit";

@customElement("pl-org-settings")
export class OrgSettingsView extends Routing(StateMixin(LitElement)) {
    readonly routePattern = /^orgs\/([^\/]+)\/settings/;

    @property()
    orgId: string = "";

    @query("#rotateKeysButton")
    private _rotateKeysButton: Button;

    private get _org() {
        return app.getOrg(this.orgId);
    }

    handleRoute([orgId]: [string]) {
        this.orgId = orgId;
        if (!this._org?.isOwner(this.app.account!)) {
            this.redirect("");
        }
    }

    private async _deleteOrg() {
        const deleted = await prompt(
            $l(
                "Are you sure you want to delete this organization? " +
                    "All associated vaults and the data within them will be lost! " +
                    "This action can not be undone."
            ),
            {
                type: "destructive",
                title: $l("Delete Organization"),
                confirmLabel: $l("Delete"),
                placeholder: $l("Type 'DELETE' to confirm"),
                validate: async (val) => {
                    if (val !== "DELETE") {
                        throw $l("Type 'DELETE' to confirm");
                    }

                    await app.deleteOrg(this._org!.id);

                    return val;
                },
            }
        );

        if (deleted) {
            this.go("");
            alert($l("Organization deleted successfully."), { type: "success", title: $l("Delete Organization") });
        }
    }

    private async _changeName() {
        await prompt("", {
            title: $l("Rename Organization"),
            confirmLabel: $l("Save"),
            label: $l("Company Name"),
            value: this._org!.name,
            validate: async (name) => {
                if (!name) {
                    throw $l("Please enter a name!");
                }

                await app.updateOrg(this._org!.id, async (org) => (org.name = name));

                return name;
            },
        });
    }

    private async _rotateKeys() {
        if (this._rotateKeysButton.state === "loading") {
            return;
        }

        const confirmed = await confirm(
            $l(
                "Do you want to rotate this organizations cryptographic keys? All organization " +
                    "memberships will have to be reconfirmed but no data will be lost."
            ),
            $l("Confirm")
        );

        if (!confirmed) {
            return;
        }

        this._rotateKeysButton.start();

        try {
            await app.rotateOrgKeys(this._org!);
            this._rotateKeysButton.success();
            alert(
                $l(
                    "The organizations cryptographic keys have been rotated successfully and " +
                        "membership confirmation requests for all members have been sent out."
                ),
                { type: "success" }
            );
        } catch (e) {
            this._rotateKeysButton.fail();
            alert(e.message || $l("Something went wrong. Please try again later!"), { type: "warning" });
        }
    }

    static styles = [shared];

    render() {
        const org = this._org;
        if (!org) {
            return;
        }

        return html`
            <div class="fullbleed vertical layout background">
                <header class="padded center-aligning horizontal layout">
                    <pl-org-nav></pl-org-nav>

                    <div class="stretch"></div>
                </header>

                <pl-scroller class="stretch">
                    <div class="vertical center-aligning padded layout">
                        <div class="vertical spacing layout fill-horizontally max-width-30em">
                            <section class="padded vertical spacing layout">
                                <h2 class="margined section-header">${$l("Security")}</h2>

                                <pl-button id="rotateKeysButton" @click=${this._rotateKeys}>
                                    ${$l("Rotate Cryptographic Keys")}
                                </pl-button>
                            </section>

                            <section class="padded vertical spacing layout">
                                <h2 class="margined section-header">${$l("General")}</h2>

                                <pl-button @click=${this._changeName}> ${$l("Change Organization Name")} </pl-button>

                                <pl-button class="negative" @click=${this._deleteOrg}>
                                    ${$l("Delete Organization")}
                                </pl-button>
                            </section>
                        </div>
                    </div>
                </pl-scroller>
            </div>
        `;
    }
}
