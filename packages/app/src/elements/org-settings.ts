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
import "./drawer";
import { ToggleButton } from "./toggle-button";
import { setClipboard } from "../lib/clipboard";
import { live } from "lit/directives/live.js";
import { checkFeatureDisabled } from "../lib/provisioning";

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

    private async _enableDirectorySync() {
        if (checkFeatureDisabled(app.getOrgFeatures(this._org!).directorySync, this._org!.isOwner(app.account!))) {
            this.requestUpdate();
            return;
        }

        const confirmed = await confirm(
            $l(
                "Do you want to enable Directory Sync via SCIM for this organization? You will be given a unique URL to provide to your Active Directory or LDAP server for synchronizing and provisioning members."
            ),
            $l("Confirm")
        );

        if (!confirmed) {
            this.requestUpdate();
            return;
        }

        // TODO: In the future, ask if only groups/members should be synchronized

        await app.updateOrg(this._org!.id, async (org) => {
            org.directory.syncProvider = "scim";
            org.directory.syncGroups = true;
            org.directory.syncMembers = true;
        });
    }

    private async _disableDirectorySync() {
        const confirmed = await confirm(
            $l(
                "Do you want to disable Directory Sync? Your members will no longer be automatically synchronized and provisioned."
            ),
            $l("Confirm")
        );

        if (!confirmed) {
            this.requestUpdate();
            return;
        }

        await app.updateOrg(this._org!.id, async (org) => {
            org.directory.syncProvider = "none";
        });
    }

    private async _toggleDirectorySync(e: Event) {
        const toggle = e.target as ToggleButton;
        toggle.active ? await this._enableDirectorySync() : await this._disableDirectorySync();
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
                            ${this._renderDirectorySettings()}

                            <section class="margined box">
                                <h2 class="padded uppercase bg-dark border-bottom semibold">${$l("Security")}</h2>

                                <div>
                                    <div class="half-padded list-item">
                                        <pl-button id="rotateKeysButton" @click=${this._rotateKeys}>
                                            ${$l("Rotate Cryptographic Keys")}
                                        </pl-button>
                                    </div>
                                </div>
                            </section>

                            <section class="margined box">
                                <h2 class="padded uppercase bg-dark border-bottom semibold">${$l("More")}</h2>

                                <div>
                                    <div class="half-padded list-item">
                                        <pl-button @click=${this._changeName}>
                                            ${$l("Change Organization Name")}
                                        </pl-button>
                                    </div>
                                    <div class="half-padded list-item">
                                        <pl-button class="negative" @click=${this._deleteOrg}>
                                            ${$l("Delete Organization")}
                                        </pl-button>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </pl-scroller>
            </div>
        `;
    }

    private _renderDirectorySettings() {
        const org = this._org!;

        const syncEnabled = org.directory.syncProvider !== "none";
        const scimUrl = (syncEnabled && org.directory.scim?.url) || "";
        const scimSecretToken = (syncEnabled && org.directory.scim?.secretToken) || "";

        const feature = app.getOrgFeatures(org).directorySync;

        if (feature.hidden && !syncEnabled) {
            return;
        }

        return html`
            <div class="vertical spacing layout fill-horizontally">
                <section class="margined box">
                    <h2 class="padded uppercase bg-dark border-bottom semibold">${$l("Directory Sync")}</h2>

                    <div>
                        <pl-toggle-button
                            class="transparent"
                            .active=${live(syncEnabled)}
                            .label=${$l("Enable Directory Sync")}
                            reverse
                            @change=${this._toggleDirectorySync}
                        >
                        </pl-toggle-button>
                    </div>

                    <pl-drawer .collapsed=${!syncEnabled}>
                        <div
                            class="padded border-top click hover"
                            @click=${() => setClipboard(scimUrl, $l("SCIM Tenant Url"))}
                        >
                            <div class="half-padded">
                                <div class="tiny blue highlighted">${$l("Tenant URL")}</div>
                                <div class="small">
                                    <code>${scimUrl}</code>
                                </div>
                            </div>
                        </div>

                        <div
                            class="padded border-top click hover"
                            @click=${() => setClipboard(scimSecretToken, $l("SCIM Secret Token"))}
                        >
                            <div class="half-padded">
                                <div class="tiny blue highlighted">${$l("Secret Token")}</div>
                                <div class="small">
                                    <code>${scimSecretToken}</code>
                                </div>
                            </div>
                        </div>
                    </pl-drawer>
                </section>
            </div>
        `;
    }
}
