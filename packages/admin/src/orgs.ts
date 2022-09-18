import { css, customElement, html, query, state } from "@padloc/app/src/elements/lit";
import { View } from "@padloc/app/src/elements/view";
import { $l } from "@padloc/locale/src/translate";
import "@padloc/app/src/elements/icon";
import { StateMixin } from "@padloc/app/src/mixins/state";
import { Routing } from "@padloc/app/src/mixins/routing";
import { ListParams, ListResponse } from "@padloc/core/src/api";
import "@padloc/app/src/elements/scroller";
import "@padloc/app/src/elements/list";
import "@padloc/app/src/elements/button";
import "@padloc/app/src/elements/input";
import "@padloc/app/src/elements/popover";
import { Input } from "@padloc/app/src/elements/input";
import "@padloc/app/src/elements/spinner";
import { alert } from "@padloc/app/src/lib/dialog";
import "@padloc/app/src/elements/select";
import { Select } from "@padloc/app/src/elements/select";
import { singleton } from "@padloc/app/src/lib/singleton";
import { OrgDialog } from "./org-dialog";
import { Org, OrgMember } from "@padloc/core/src/org";

@customElement("pl-admin-orgs")
export class Orgs extends StateMixin(Routing(View)) {
    routePattern = /^orgs(?:\/([^\/]+))?/;

    @state()
    private _data: ListResponse<Org> = new ListResponse();

    @state()
    private _loading = false;

    @state()
    private _itemsPerPage = 50;

    @query("#searchInput")
    private _searchInput: Input;

    @query("#itemsPerPageSelect")
    private _itemsPerPageSelect: Select;

    @singleton("pl-org-dialog")
    private _orgDialog: OrgDialog;

    private _orgDialogCloseHandler = () => {
        this._orgDialog.removeEventListener("open-account", this._openAccountHandler);
        this.router.go("orgs");
    };
    private _openAccountHandler = (e: Event) => {
        const {
            detail: { member },
        } = e as CustomEvent<{ member: OrgMember }>;
        this._orgDialog.removeEventListener("dialog-close", this._orgDialogCloseHandler);
        this._orgDialog.removeEventListener("open-account", this._openAccountHandler);
        this._orgDialog.dismiss();
        this.go(`accounts/${member.id}`);
    };

    async handleRoute([orgId]: [string]) {
        if (orgId) {
            const org = await this.app.api.getOrg(orgId);
            if (!org) {
                this.redirect("orgs");
                return;
            }
            this._orgDialog.addEventListener("dialog-close", this._orgDialogCloseHandler);
            this._orgDialog.addEventListener("open-account", this._openAccountHandler);
            this._orgDialog.show(org);
        } else {
            this._orgDialog.removeEventListener("dialog-close", this._orgDialogCloseHandler);
            this._orgDialog.removeEventListener("open-account", this._openAccountHandler);
            this._orgDialog.dismiss();
            this._load();
        }
    }

    protected _deactivated() {
        if (this._orgDialog.open) {
            this._orgDialog.removeEventListener("dialog-close", this._orgDialogCloseHandler);
            this._orgDialog.dismiss();
        }
    }

    private async _load(offset = 0) {
        this._loading = true;
        try {
            console.log(this._searchInput.value);
            this._data = await this.app.api.listOrgs(
                new ListParams({
                    offset,
                    limit: this._itemsPerPage,
                    query: this._searchInput.value
                        ? { path: "name", op: "regex", value: `.*${this._searchInput.value}.*` }
                        : undefined,
                })
            );
        } catch (e) {
            alert(e.message, { type: "warning" });
        }

        this._loading = false;
    }

    private _loadNext() {
        return this._load(this._data.offset + this._itemsPerPage);
    }

    private _loadPrevious() {
        return this._load(Math.max(this._data.offset - this._itemsPerPage, 0));
    }

    private _formatDateTime(date: Date) {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: "short",
            timeStyle: "medium",
        } as any).format(date);
    }

    private _itemsPerPageSelected() {
        this._itemsPerPage = this._itemsPerPageSelect.value;
        this._load(0);
    }

    private _openOrg(org: Org) {
        this.go(`orgs/${org.id}`);
    }

    static styles = [
        ...View.styles,
        css`
            table {
                border-collapse: collapse;
                width: 100%;
            }

            thead th {
                font-weight: 600;
                position: sticky;
                top: 0;
                background: var(--color-background);
                text-align: left;
            }

            th > div {
                padding: 0.5em;
                border-bottom: solid 1px var(--border-color);
            }

            td {
                padding: 0.5em;
                text-align: left;
                border: solid 1px var(--border-color);
            }

            tbody tr:hover {
                cursor: pointer;
                color: var(--color-highlight);
            }

            tr:first-child td {
                border-top: none;
            }

            tr:last-child td {
                border-bottom: none;
            }

            tr :last-child {
                border-right: none;
            }

            tr :first-child {
                border-left: none;
            }

            #searchInput {
                padding: 0.25em;
                --input-padding: 0.3em 0.5em;
                border: none;
            }
        `,
    ];

    render() {
        return html`
            <div class="fullbleed vertical layout">
                <header class="padded center-aligning spacing horizontal layout border-bottom">
                    <pl-icon icon="org"></pl-icon>
                    <div class="ellipsis">${$l("Orgs")}</div>

                    <div class="stretch"></div>

                    <pl-button class="skinny transparent" @click=${() => this._load(this._data.offset)}>
                        <pl-icon icon="refresh"></pl-icon>
                    </pl-button>
                </header>

                <div class="border-bottom">
                    <pl-input
                        id="searchInput"
                        type="search"
                        class="small"
                        .placeholder=${$l("Search...")}
                        @enter=${() => this._load()}
                    >
                    </pl-input>
                </div>
                <div class="stretch scrolling">
                    <table class="small">
                        <thead>
                            <tr>
                                <th><div>${$l("Name")}</div></th>
                                <th><div>${$l("Owner")}</div></th>
                                <th><div>${$l("Created")}</div></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this._data.items.map(
                                (org) => html`
                                    <tr @click=${() => this._openOrg(org)}>
                                        <td>${org.name}</td>
                                        <td>${org.owner?.email}</td>
                                        <td>${this._formatDateTime(org.created)}</td>
                                    </tr>
                                `
                            )}
                        </tbody>
                    </table>
                </div>
                <div class="padded horizontal layout border-top">
                    <pl-select
                        id="itemsPerPageSelect"
                        class="small slim"
                        .options=${[
                            { value: 50, label: "50 items per page" },
                            { value: 100, label: "100 items per page" },
                            { value: 500, label: "500 items per page" },
                            { value: 1000, label: "1000 items per page" },
                        ]}
                        .value=${this._itemsPerPage as any}
                        @change=${this._itemsPerPageSelected}
                    ></pl-select>
                    <div class="stretch"></div>
                    <pl-button
                        class="slim transparent"
                        @click=${() => this._loadPrevious()}
                        ?disabled=${this._data.offset === 0}
                    >
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>
                    <div class="padded">
                        ${this._data.offset} - ${this._data.offset + this._data.items.length} / ${this._data.total}
                    </div>
                    <pl-button
                        class="slim transparent"
                        @click=${() => this._loadNext()}
                        ?disabled=${this._data.offset + this._data.items.length >= this._data.total}
                    >
                        <pl-icon icon="forward"></pl-icon>
                    </pl-button>
                </div>
            </div>

            <div class="fullbleed centering layout scrim" ?hidden=${!this._loading}>
                <pl-spinner .active=${this._loading}></pl-spinner>
            </div>
        `;
    }
}
