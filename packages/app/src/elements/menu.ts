import { translate as $l } from "@padloc/locale/src/translate";
import { ErrorCode } from "@padloc/core/src/error";
import { Vault } from "@padloc/core/src/vault";
import { app } from "../globals";
import { shared } from "../styles";
import { alert } from "../lib/dialog";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import "./logo";
import "./spinner";
import "./button";
import "./drawer";
import "./drawer";
import "./scroller";
import "./list";
import { customElement, property, state } from "lit/decorators.js";
import { css, html, LitElement } from "lit";

const orgPages = [
    { path: "dashboard", label: $l("Dashboard"), icon: "dashboard" },
    { path: "members", label: $l("Members"), icon: "members" },
    { path: "groups", label: $l("Groups"), icon: "group" },
    { path: "vaults", label: $l("Vaults"), icon: "vaults" },
    { path: "settings", label: $l("Settings"), icon: "settings" },
    { path: "invites", label: $l("Invites"), icon: "mail" },
];

@customElement("pl-menu")
export class Menu extends Routing(StateMixin(LitElement)) {
    readonly routePattern = /^([^\/]+)(?:\/([^\/]+)\/([^\/]+))?/;

    @property()
    selected: string;

    @state()
    private _expanded = new Set<string>();

    async handleRoute(
        [page, id, subPage]: [string, string, string],
        { vault, tag, favorites, recent, attachments, host }: { [prop: string]: string }
    ) {
        this._expanded.clear();
        switch (page) {
            case "items":
                if (vault) {
                    this.selected = `vault/${vault}`;
                    const vlt = app.getVault(vault)!;
                    if (vlt?.org) {
                        this._expanded.add(`org_${vlt.org.id}_vaults`);
                    }
                } else if (tag) {
                    this.selected = `tag/${tag}`;
                    this._expanded.add(`tags`);
                } else if (favorites) {
                    this.selected = "favorites";
                } else if (recent) {
                    this.selected = "recent";
                } else if (attachments) {
                    this.selected = "attachments";
                } else if (host) {
                    this.selected = "host";
                } else {
                    this.selected = "items";
                }
                break;
            case "orgs":
                this._expanded.clear();
                this._expanded.add(`org_${id}_manage`);
                this.selected = `orgs/${id}/${subPage}`;
                break;
            case "invite":
                this.selected = `invite/${id}/${subPage}`;
                break;
            default:
                this.selected = page;
        }

        await this.updateComplete;
    }

    private _goTo(path: string, params?: any, e?: Event) {
        this.dispatchEvent(new CustomEvent("toggle-menu", { bubbles: true, composed: true }));
        this.go(path, params);
        e && e.stopPropagation();
    }

    private async _lock() {
        this.dispatchEvent(new CustomEvent("toggle-menu", { bubbles: true, composed: true }));
        await app.lock();
        this.go("unlock", { nobio: "1" });
    }

    private _getPremium(e?: MouseEvent) {
        e && e.stopPropagation();
        this.dispatchEvent(new CustomEvent("get-premium", { bubbles: true, composed: true }));
        this.dispatchEvent(new CustomEvent("toggle-menu", { bubbles: true, composed: true }));
    }

    private _displayVaultError(vault: Vault, e?: Event) {
        e && e.stopPropagation();

        const error = vault.error!;

        switch (error.code) {
            case ErrorCode.UNSUPPORTED_VERSION:
                alert(
                    $l(
                        "A newer version of Padloc is required to synchronize this vault. Please update to the latest version now!"
                    ),
                    {
                        title: "Update Required",
                        type: "warning",
                    }
                );
                return;
            case ErrorCode.MISSING_ACCESS:
                alert($l("This vault could not be synchronized because you no longer have access to it."), {
                    title: "Sync Failed",
                    type: "warning",
                });
                return;
            case ErrorCode.DECRYPTION_FAILED:
            case ErrorCode.ENCRYPTION_FAILED:
                alert(
                    $l("This vault could not be synchronized because you currently don't have access to it's data."),
                    {
                        title: "Sync Failed",
                        type: "warning",
                    }
                );
                return;
            default:
                alert(
                    error.message ||
                        $l(
                            "An unknown error occured while synchronizing this vault. If this problem persists please contact customer support."
                        ),
                    {
                        title: "Sync Failed",
                        type: "warning",
                    }
                );
                return;
        }
    }

    private _toggleExpanded(val: string) {
        this._expanded.has(val) ? this._expanded.delete(val) : this._expanded.add(val);
        this.requestUpdate();
    }

    private _nextTheme() {
        const currTheme = app.settings.theme;
        app.setSettings({ theme: currTheme === "auto" ? "dark" : currTheme === "dark" ? "light" : "auto" });
    }

    static styles = [
        shared,
        css`
            :host {
                display: flex;
                flex-direction: column;
                position: relative;
                background: var(--menu-background);
                color: var(--color-foreground);
                border-right: solid 1px var(--border-color);
            }

            .sub-list {
                font-size: var(--font-size-small);
                display: block;
                padding-left: calc(2 * var(--spacing));
                padding-right: 0.3em;
            }

            pl-logo {
                height: var(--menu-logo-height, 2.5em);
                width: var(--menu-logo-width, auto);
                margin: 1em auto 0 auto;
            }

            .syncing {
                width: 20px;
                height: 20px;
                margin: 5px;
            }

            .get-premium {
                background: var(--color-negative);
            }

            .section-header {
                margin: 0.5em 1em;
            }

            .errors-button {
                background: var(--color-negative);
                padding: 0;
                padding-right: 8px;
                display: flex;
                align-items: center;
                font-weight: bold;
            }

            .menu-footer {
                border-top: var(--menu-footer-border);
            }

            .menu-footer-button {
                --button-background: transparent;
                --button-color: var(--menu-footer-button-color);
                --button-padding: var(--menu-footer-button-padding);
                width: var(--menu-footer-button-width);
            }

            .menu-footer-button-icon {
                font-size: var(--menu-footer-button-icon-size);
            }

            .menu-footer-button-label {
                font-size: var(--menu-footer-button-label-size);
            }

            @supports (-webkit-overflow-scrolling: touch) {
                pl-logo {
                    margin-top: max(env(safe-area-inset-top), 15px);
                }

                .footer {
                    padding-bottom: max(calc(env(safe-area-inset-bottom) / 3), 5px);
                    padding-left: max(calc(env(safe-area-inset-bottom) / 3), 5px);
                }
            }
        `,
    ];

    render() {
        const mainVault = app.mainVault;
        const account = app.account;

        if (!mainVault || !account) {
            return html``;
        }

        const itemsQuota = app.getItemsQuota();

        const tags = app.state.tags;

        const count = app.count;

        const currentHost =
            this.app.state.context.browser?.url &&
            new URL(this.app.state.context.browser.url).hostname.replace(/^www\./, "");

        return html`
            <div class="padded">
                <pl-logo reveal></pl-logo>

                <div class="subtle tiny text-centering">v${process.env.PL_VERSION}</div>

                <div class="spacer"></div>
            </div>

            <pl-scroller class="stretch">
                <pl-list itemSelector=".menu-item">
                    <div class="small subtle section-header">${$l("Vaults & Items")}</div>

                    ${currentHost
                        ? html`
                              <div
                                  class="menu-item"
                                  role="link"
                                  @click=${() => this._goTo("items", { host: true })}
                                  aria-selected=${this.selected === "host"}
                                  ?hidden=${!count.currentHost}
                              >
                                  <pl-icon icon="web"></pl-icon>

                                  <div class="stretch ellipsis">${currentHost}</div>

                                  <div class="small subtle">${count.currentHost}</div>
                              </div>
                          `
                        : ""}

                    <div
                        class="menu-item"
                        role="link"
                        @click=${() => this._goTo("items", {})}
                        aria-selected=${this.selected === "items"}
                    >
                        <pl-icon icon="vaults"></pl-icon>
                        <div class="stretch">${$l("All Vaults")}</div>
                        <div class="small subtle">${count.total}</div>
                    </div>

                    <div
                        class="menu-item"
                        role="link"
                        class="transparent horizontal center-aligning text-left-aligning spacing layout"
                        @click=${() => this._goTo("items", { recent: true })}
                        aria-selected=${this.selected === "recent"}
                    >
                        <pl-icon icon="time"></pl-icon>

                        <div class="stretch">${$l("Recently Used")}</div>

                        <div class="small subtle">${count.recent}</div>
                    </div>

                    <div
                        class="menu-item favorites"
                        role="link"
                        @click=${() => this._goTo("items", { favorites: true })}
                        aria-selected=${this.selected === "favorites"}
                    >
                        <pl-icon icon="favorite"></pl-icon>

                        <div class="stretch">${$l("Favorites")}</div>

                        <div class="small subtle">${count.favorites}</div>
                    </div>

                    <div
                        class="menu-item"
                        @click=${() => this._goTo("items", { attachments: true })}
                        aria-selected=${this.selected === "attachments"}
                    >
                        <pl-icon icon="attachment"></pl-icon>

                        <div class="stretch">${$l("Attachments")}</div>

                        <div class="small subtle">${count.attachments}</div>
                    </div>

                    <div
                        class="menu-item"
                        @click=${() => this._goTo("items", { vault: mainVault.id })}
                        aria-selected=${this.selected === `vault/${mainVault.id}`}
                    >
                        <pl-icon icon="vault"></pl-icon>
                        <div class="stretch">${$l("My Vault")}</div>
                        ${mainVault.error
                            ? html`
                                  <pl-button
                                      class="small negative borderless skinny negatively-margined"
                                      @click=${(e: Event) => this._displayVaultError(mainVault, e)}
                                  >
                                      <pl-icon icon="error"></pl-icon>
                                  </pl-button>
                              `
                            : itemsQuota !== -1
                            ? html`
                                  <pl-button
                                      class="small negative borderless skinny negatively-margined"
                                      @click=${this._getPremium}
                                  >
                                      ${mainVault.items.size} / ${itemsQuota}
                                  </pl-button>
                              `
                            : html` <div class="small subtle">${mainVault.items.size}</div> `}
                    </div>

                    ${app.orgs.map((org) => {
                        const vaults = app.vaults.filter((v) => v.org && v.org.id === org.id);

                        return html`
                            <div>
                                <div
                                    class="menu-item"
                                    @click=${() => this._toggleExpanded(`org_${org.id}_vaults`)}
                                    aria-expanded=${this._expanded.has(`org_${org.id}_vaults`)}
                                >
                                    <pl-icon icon="vaults"></pl-icon>
                                    <div class="stretch ellipsis">${org.name}</div>
                                    <pl-button
                                        class="small transparent round slim negatively-margined reveal-on-hover"
                                        @click=${(e: Event) => this._goTo(`orgs/${org.id}`, undefined, e)}
                                    >
                                        <pl-icon icon="settings"></pl-icon>
                                    </pl-button>
                                    <pl-icon icon="chevron-down" class="small subtle dropdown-icon"></pl-icon>
                                </div>

                                <pl-drawer .collapsed=${!this._expanded.has(`org_${org.id}_vaults`)}>
                                    <pl-list class="sub-list">
                                        ${vaults.map((vault) => {
                                            return html`
                                                <div
                                                    class="menu-item"
                                                    @click=${() => this._goTo("items", { vault: vault.id })}
                                                    aria-selected=${this.selected === `vault/${vault.id}`}
                                                >
                                                    <pl-icon icon="vault"></pl-icon>
                                                    <div class="stretch ellipsis">${vault.name}</div>

                                                    ${vault.error
                                                        ? html`
                                                              <pl-button
                                                                  class="small negative borderless skinny negatively-margined"
                                                                  @click=${(e: Event) =>
                                                                      this._displayVaultError(vault, e)}
                                                              >
                                                                  <pl-icon icon="error"></pl-icon>
                                                              </pl-button>
                                                          `
                                                        : html` <div class="small subtle">${vault.items.size}</div> `}
                                                </div>
                                            `;
                                        })}

                                        <div
                                            class="menu-item subtle"
                                            @click=${() => this._goTo(`orgs/${org.id}/vaults/new`)}
                                        >
                                            <pl-icon icon="add"></pl-icon>

                                            <div class="stretch">${$l("New Vault")}</div>
                                        </div>
                                    </pl-list>
                                </pl-drawer>
                            </div>
                        `;
                    })}

                    <div>
                        <div
                            class="menu-item"
                            @click=${() => this._toggleExpanded("tags")}
                            aria-expanded=${this._expanded.has("tags")}
                        >
                            <pl-icon icon="tags"></pl-icon>
                            <div class="stretch ellipsis">${$l("Tags")}</div>
                            <pl-icon icon="chevron-down" class="small subtle dropdown-icon"></pl-icon>
                        </div>

                        <pl-drawer .collapsed=${!this._expanded.has("tags")}>
                            ${tags.length
                                ? html`
                                      <pl-list class="sub-list">
                                          ${tags.map(
                                              ([tag, count]) => html`
                                                  <div
                                                      class="menu-item"
                                                      @click=${() => this._goTo("items", { tag })}
                                                      aria-selected=${this.selected === `tag/${tag}`}
                                                  >
                                                      <pl-icon icon="tag"></pl-icon>

                                                      <div class="stretch ellipsis">${tag}</div>

                                                      <div class="small subtle">${count}</div>
                                                  </div>
                                              `
                                          )}
                                      </pl-list>
                                  `
                                : html`
                                      <div class="small padded subtle text-centering">
                                          ${$l("You don't have any tags yet.")}
                                      </div>
                                  `}
                        </pl-drawer>
                    </div>

                    <div class="small subtle section-header">${$l("Orgs & Teams")}</div>

                    <pl-list>
                        ${app.orgs
                            .filter((org) => org.isAdmin(account))
                            .map(
                                (org) => html`
                                    <div>
                                        <div
                                            class="menu-item"
                                            @click=${() => this._toggleExpanded(`org_${org.id}_manage`)}
                                            aria-expanded=${this._expanded.has(`org_${org.id}_manage`)}
                                        >
                                            <pl-icon icon="org"></pl-icon>
                                            <div class="stretch ellipsis">${org.name}</div>
                                            <pl-icon icon="chevron-down" class="small subtle dropdown-icon"></pl-icon>
                                        </div>

                                        <pl-drawer .collapsed=${!this._expanded.has(`org_${org.id}_manage`)}>
                                            <pl-list class="sub-list">
                                                ${orgPages.map(
                                                    ({ label, icon, path }) => html` <div
                                                        class="menu-item"
                                                        aria-selected=${this.selected === `orgs/${org.id}/${path}`}
                                                        @click=${() => this._goTo(`orgs/${org.id}/${path}`)}
                                                        ?hidden=${["settings", "invites"].includes(path) &&
                                                        !org.isOwner(account)}
                                                    >
                                                        <pl-icon icon="${icon}"></pl-icon>

                                                        <div class="stretch ellipsis">${label}</div>
                                                    </div>`
                                                )}
                                            </pl-list>
                                        </pl-drawer>
                                    </div>
                                `
                            )}

                        <div
                            class="menu-item subtle"
                            @click=${() =>
                                this.dispatchEvent(new CustomEvent("create-org", { bubbles: true, composed: true }))}
                        >
                            <pl-icon icon="add"></pl-icon>

                            <div class="stretch">${$l("New Organization")}</div>
                        </div>
                    </pl-list>

                    ${app.authInfo?.invites.length
                        ? html`
                              <div class="small subtle section-header">${$l("Invites")}</div>
                              ${app.authInfo.invites.map(
                                  (invite) => html`
                                      <div
                                          class="menu-item"
                                          @click=${() => this._goTo(`invite/${invite.orgId}/${invite.id}`)}
                                          aria-selected=${this.selected === `invite/${invite.orgId}/${invite.id}`}
                                      >
                                          <pl-icon icon="mail"></pl-icon>

                                          <div class="stretch">${invite.orgName}</div>

                                          <pl-icon icon="chevron-right" class="small subtle dropdown-icon"></pl-icon>
                                      </div>
                                  `
                              )}
                          `
                        : ""}

                    <div class="small subtle section-header">${$l("More")}</div>

                    <div
                        class="menu-item"
                        @click=${() => this._goTo("settings")}
                        aria-selected=${this.selected === "settings"}
                    >
                        <pl-icon icon="settings"></pl-icon>

                        <div class="stretch">${$l("Settings")}</div>
                    </div>

                    <div
                        class="menu-item"
                        @click=${() => this._goTo("generator")}
                        aria-selected=${this.selected === "generator"}
                    >
                        <pl-icon icon="generate"></pl-icon>

                        <div class="stretch">${$l("Password Generator")}</div>
                    </div>

                    <div
                        class="menu-item"
                        @click=${() => this._goTo("support")}
                        aria-selected=${this.selected === "support"}
                    >
                        <pl-icon icon="support"></pl-icon>

                        <div class="stretch">${$l("Support")}</div>
                    </div>
                </pl-list>
            </pl-scroller>

            <div class="half-padded center-aligning horizontal layout menu-footer">
                <pl-button class="menu-footer-button" @click=${this._lock}>
                    <div class="vertical centering layout">
                        <pl-icon icon="lock" class="menu-footer-button-icon"></pl-icon>
                        <div class="menu-footer-button-label">Lock</div>
                    </div>
                </pl-button>
                <pl-button class="menu-footer-button" @click=${this._nextTheme} title="Theme: ${app.settings.theme}">
                    <div class="vertical centering layout">
                        <pl-icon icon="theme-${app.settings.theme}" class="menu-footer-button-icon"></pl-icon>
                        <div class="menu-footer-button-label">Theme</div>
                    </div>
                </pl-button>
                <pl-button
                    class="menu-footer-button"
                    @click=${() => app.synchronize()}
                    .state=${app.state.syncing ? "loading" : "idle"}
                >
                    <div class="vertical centering layout">
                        <pl-icon icon="refresh" class="menu-footer-button-icon"></pl-icon>
                        <div class="menu-footer-button-label">Sync</div>
                    </div>
                </pl-button>
                <pl-button class="menu-footer-button" @click=${() => this._goTo("settings")}>
                    <div class="vertical centering layout">
                        <pl-icon icon="settings" class="menu-footer-button-icon"></pl-icon>
                        <div class="menu-footer-button-label">Settings</div>
                    </div>
                </pl-button>
            </div>
        `;
    }
}
