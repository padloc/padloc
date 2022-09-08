import { css, customElement, html, query, state } from "@padloc/app/src/elements/lit";
import { View } from "@padloc/app/src/elements/view";
import { $l } from "@padloc/locale/src/translate";
import "@padloc/app/src/elements/icon";
import { StateMixin } from "@padloc/app/src/mixins/state";
import { Routing } from "@padloc/app/src/mixins/routing";
import { ListAccountsParams } from "@padloc/core/src/api";
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
import { Account } from "@padloc/core/src/account";
import { singleton } from "@padloc/app/src/lib/singleton";
import { AccountDialog } from "./account-dialog";

@customElement("pl-admin-accounts")
export class Accounts extends StateMixin(Routing(View)) {
    routePattern = /^accounts(?:\/([^\/]+))?/;

    @state()
    private _accounts: Account[] = [];

    @state()
    private _loading = false;

    @state()
    private _itemsPerPage = 50;

    @query("#searchInput")
    private _searchInput: Input;

    @query("#itemsPerPageSelect")
    private _itemsPerPageSelect: Select;

    @singleton("pl-account-dialog")
    private _accountDialog: AccountDialog;

    private _offset = 0;

    private _accountDialogCloseHandler = () => this.router.back();

    async handleRoute([accountId]: [string]) {
        if (accountId) {
            console.log(accountId);
            const account = await this.app.api.getAccount(accountId);
            if (!account) {
                this.redirect("accounts");
                return;
            }
            this._accountDialog.addEventListener("dialog-close", this._accountDialogCloseHandler);
            this._accountDialog.show(account);
        } else {
            this._accountDialog.removeEventListener("dialog-close", this._accountDialogCloseHandler);
            this._accountDialog.dismiss();
            this._load();
        }
    }

    private async _load(offset = 0) {
        this._loading = true;
        try {
            console.log(this._searchInput.value);
            const { accounts } = await this.app.api.listAccounts(
                new ListAccountsParams({
                    offset,
                    limit: this._itemsPerPage,
                    search: this._searchInput.value,
                })
            );

            console.log(accounts);
            this._accounts = accounts;
            this._offset = offset;
        } catch (e) {
            alert(e.message, { type: "warning" });
        }

        this._loading = false;
    }

    private _loadNext() {
        return this._load(this._offset + this._accounts.length);
    }

    private _loadPrevious() {
        return this._load(Math.max(this._offset - this._itemsPerPage, 0));
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

    private _openAccount(account: Account) {
        this.go(`accounts/${account.id}`);
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
                    <pl-icon icon="user"></pl-icon>
                    <div class="ellipsis">${$l("Accounts")}</div>

                    <div class="stretch"></div>

                    <pl-button class="skinny transparent" @click=${() => this._load(this._offset)}>
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
                                <th><div>${$l("Email")}</div></th>
                                <th><div>${$l("Name")}</div></th>
                                <th><div>${$l("Created")}</div></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this._accounts.map(
                                (account) => html`
                                    <tr @click=${() => this._openAccount(account)}>
                                        <td>${account.email}</td>
                                        <td>${account.name}</td>
                                        <td>${this._formatDateTime(account.created)}</td>
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
                            { value: 50, label: "50 events per page" },
                            { value: 100, label: "100 events per page" },
                            { value: 500, label: "500 events per page" },
                            { value: 1000, label: "1000 events per page" },
                        ]}
                        .value=${this._itemsPerPage as any}
                        @change=${this._itemsPerPageSelected}
                    ></pl-select>
                    <div class="stretch"></div>
                    <pl-button
                        class="slim transparent"
                        @click=${() => this._loadPrevious()}
                        ?disabled=${this._offset === 0}
                    >
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>
                    <div class="padded">${this._offset} - ${this._offset + this._accounts.length}</div>
                    <pl-button
                        class="slim transparent"
                        @click=${() => this._loadNext()}
                        ?disabled=${this._accounts.length < this._itemsPerPage}
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
