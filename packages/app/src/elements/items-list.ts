import { VaultItem, Field, Tag } from "@padloc/core/src/item";
import { Vault, VaultID } from "@padloc/core/src/vault";
import { translate as $l } from "@padloc/locale/src/translate";
import { debounce, wait, escapeRegex } from "@padloc/core/src/util";
import { AttachmentInfo } from "@padloc/core/src/attachment";
import { cache } from "lit-html/directives/cache";
import { StateMixin } from "../mixins/state";
import { setClipboard } from "../lib/clipboard";
import { app, router } from "../globals";
import { dialog, confirm } from "../lib/dialog";
import { mixins, shared } from "../styles";
import { fileIcon, fileSize } from "../lib/util";
import { BaseElement, element, html, css, property, query, listen, observe } from "./base";
import { Input } from "./input";
import { MoveItemsDialog } from "./move-items-dialog";
import { AttachmentDialog } from "./attachment-dialog";
import "./icon";
import "./items-filter";
import "./virtual-list";
import "./totp";
import "./button";

interface ListItem {
    item: VaultItem;
    vault: Vault;
    section?: string;
    firstInSection?: boolean;
    lastInSection?: boolean;
    warning?: boolean;
}

export interface ItemsFilter {
    vault?: VaultID;
    tag?: Tag;
    favorites?: boolean;
    attachments?: boolean;
    recent?: boolean;
    host?: boolean;
}

function filterByString(fs: string, rec: VaultItem) {
    if (!fs) {
        return true;
    }
    const content = [rec.name, ...rec.tags, ...rec.fields.map((f) => f.name), ...rec.fields.map((f) => f.value)]
        .join(" ")
        .toLowerCase();
    return content.search(escapeRegex(fs.toLowerCase())) !== -1;
}

@element("pl-items-list")
export class ItemsList extends StateMixin(BaseElement) {
    @property()
    selected: string = "";

    @property()
    multiSelect: boolean = false;

    @property()
    filter?: ItemsFilter;

    @property()
    private _listItems: ListItem[] = [];
    // @property()
    // private _firstVisibleIndex: number = 0;
    // @property()
    // private _lastVisibleIndex: number = 0;

    // @query("#main")
    // private _main: HTMLElement;
    @query("#filterInput")
    private _filterInput: Input;

    @property()
    private _filterShowing: boolean = false;

    private _cachedBounds: DOMRect | ClientRect | null = null;
    // private _selected = new Map<string, ListItem>();

    @dialog("pl-move-items-dialog")
    private _moveItemsDialog: MoveItemsDialog;

    @dialog("pl-attachment-dialog")
    private _attachmentDialog: AttachmentDialog;

    private _multiSelect = new Map<string, ListItem>();

    private _updateItems = debounce(() => {
        this._listItems = this._getItems();
    }, 50);

    @observe("filter")
    async stateChanged() {
        // Clear items from selection that are no longer in list (due to filtering)
        for (const id of this._multiSelect.keys()) {
            if (!this._listItems.some((i) => i.item.id === id)) {
                this._multiSelect.delete(id);
            }
        }

        // When the app is getting locked, give the lock animation some time to finish
        if (this._listItems.length && this.state.locked) {
            await wait(500);
        }

        this._updateItems();
    }

    async search() {
        this._filterShowing = true;
        await this.updateComplete;
        this._filterInput.focus();
    }

    cancelFilter() {
        this._filterInput.value = "";
        this._filterInput.blur();
        this._filterShowing = false;
        this._updateItems();
    }

    selectItem(item: ListItem) {
        if (this.multiSelect) {
            if (this._multiSelect.has(item.item.id)) {
                this._multiSelect.delete(item.item.id);
            } else {
                this._multiSelect.set(item.item.id, item);
            }
            this.requestUpdate();
        } else {
            if (this.selected === item.item.id) {
                router.go("items");
            } else {
                router.go(`items/${item.item.id}`);
            }
        }
    }

    selectAll() {
        this.multiSelect = true;
        for (const item of this._listItems) {
            this._multiSelect.set(item.item.id, item);
        }
        this.requestUpdate();
    }

    clearSelection() {
        this._multiSelect.clear();
        this.requestUpdate();
    }

    cancelMultiSelect() {
        this._multiSelect.clear();
        this.multiSelect = false;
        this.requestUpdate();
    }

    firstUpdated() {
        this._resizeHandler();
    }

    static styles = [
        shared,
        css`
            :host {
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                position: relative;
                background: var(--color-background);
            }

            header {
                overflow: visible;
                --input-focus-color: transparent;
            }

            main {
                position: relative;
                flex: 1;
            }

            .item-header {
                padding-left: 0.5em;
                margin-bottom: 0.5em;
                margin-top: 0.3em;
            }

            .list-item[aria-selected] {
                --color-highlight: var(--color-white);
            }

            .list-item .tags .tag-name {
                max-width: 60px;
            }

            .item-fields {
                position: relative;
                display: flex;
                overflow-x: auto;
                font-size: var(--font-size-small);
                -webkit-overflow-scrolling: touch;
                margin: 0 -0.5em;
                padding-left: 0.5em;
            }

            .item-fields::after {
                content: "";
                display: block;
                width: 0.5em;
                flex: none;
            }

            .item-field {
                cursor: pointer;
                position: relative;
                flex: 1;
                border-radius: 0.5em;
                max-width: calc(60%);
                opacity: 0.999;
            }

            .item-field.dragging {
                background: var(--color-tertiary);
            }

            .item-field.dragging::after {
                background: none;
            }

            .item-field > * {
                transition: transform 0.2s cubic-bezier(1, -0.3, 0, 1.3), opacity 0.2s;
            }

            .item-field:not(.copied) .copied-message,
            .item-field.copied .item-field-label {
                opacity: 0;
                transform: scale(0);
            }

            .copied-message {
                ${mixins.fullbleed()}
                border-radius: inherit;
                font-weight: bold;
                color: var(--color-highlight);
                text-align: center;
                line-height: 45px;
            }

            .copied-message::before {
                font-family: "FontAwesome";
                content: "\\f00c\\ ";
            }

            .item-field-label {
                padding: 0.3em 0.5em;
                pointer-events: none;
                min-width: 0;
            }

            .item-field-name {
                color: var(--color-highlight);
                margin-bottom: 0.1em;
                font-weight: 600;
                ${mixins.ellipsis()}
            }

            .item-field-value {
                font-weight: 600;
                ${mixins.ellipsis()}
            }

            .item-field-value > * {
                vertical-align: middle;
            }

            .item-check {
                position: relative;
                width: 1.7em;
                height: 1.7em;
                box-sizing: border-box;
                border: solid 0.2em transparent;
                background: var(--color-shade-1);
                border-radius: 1.7em;
            }

            .item-check::after {
                content: "";
                display: block;
                ${mixins.fullbleed()}
                background: var(--color-negative);
                border-radius: inherit;
                transition: transform 0.2s, opacity 0.2s;
                transition-timing-function: cubic-bezier(1, -0.3, 0, 1.3);
            }

            .item-check:not([checked])::after {
                opacity: 0;
                transform: scale(0);
            }

            .selected-count {
                text-align: center;
                display: block;
                margin-left: 12px;
                background: rgba(255, 255, 255, 0.9);
                border-radius: var(--border-radius);
                padding: 12px 4px;
                line-height: 1.2em;
                font-size: var(--font-size-tiny);
                font-weight: bold;
                box-shadow: rgba(0, 0, 0, 0.3) 0 1px 3px;
            }
        `,
    ];

    render() {
        const { favorites, recent, attachments, host, vault: vaultId, tag } = this.filter || {};
        const placeholder = this._listItems.length
            ? {}
            : this._filterShowing
            ? {
                  icon: "search",
                  text: $l("Your search did not match any items."),
              }
            : vaultId
            ? {
                  icon: "vault",
                  text: $l("This vault does not have any items yet."),
              }
            : attachments
            ? {
                  icon: "attachment",
                  text: $l("You don't have any attachments yet."),
              }
            : favorites
            ? {
                  icon: "favorite",
                  text: $l("You don't have any favorites yet."),
              }
            : recent
            ? {
                  icon: "time",
                  text: $l("You don't have any recently used items!"),
              }
            : {
                  icon: "list",
                  text: $l("You don't have any items yet."),
              };

        const vault = vaultId && app.getVault(vaultId);
        const org = vault && vault.org && app.getOrg(vault.org.id);

        const title = favorites
            ? $l("Favorites")
            : recent
            ? $l("Recently Used")
            : attachments
            ? $l("Attachments")
            : host
            ? this.state.currentHost
            : vault
            ? org
                ? `${org.name} / ${vault.name}`
                : vault.name
            : tag || $l("All Vaults");

        return html`
            <header
                class="padded spacing horizontal center-aligning layout"
                ?hidden=${this.multiSelect || this._filterShowing}
            >
                <pl-button
                    label="${$l("Menu")}"
                    class="transparent slim menu-button"
                    @click=${() => this.dispatch("toggle-menu")}
                >
                    <pl-icon icon="menu"></pl-icon>
                </pl-button>

                <div class="spacer wide-only"></div>

                <div class="stretch bold large ellipsis">${title}</div>

                <div class="horizontal layout">
                    <pl-button class="transparent slim" @click=${() => (this.multiSelect = true)}>
                        <pl-icon icon="checked"></pl-icon>
                    </pl-button>

                    <pl-button class="transparent slim" @click=${() => this.dispatch("create-item")}>
                        <pl-icon icon="add"></pl-icon>
                    </pl-button>

                    <pl-button class="transparent slim" @click=${() => this.search()} ?hidden=${this._filterShowing}>
                        <pl-icon icon="search"></pl-icon>
                    </pl-button>
                </div>
            </header>

            <header
                class="horizontally-padded horizontal center-aligning layout"
                ?hidden=${this.multiSelect || !this._filterShowing}
            >
                <pl-button
                    class="bold ellipsis horizontal spacing center-aligning layout skinny rounded"
                    @click=${() => this.dispatch("toggle-menu")}
                >
                    <pl-icon class="small" icon="search"></pl-icon>
                    <div class="stretch">${title}</div>
                </pl-button>

                <pl-input
                    class="stretch transparent"
                    .placeholder=${$l("Type To Search")}
                    id="filterInput"
                    select-on-focus
                    @input=${this._updateItems}
                    @escape=${this.cancelFilter}
                >
                </pl-input>

                <pl-button class="transparent slim" @click=${() => this.cancelFilter()}>
                    <pl-icon icon="cancel"></pl-icon>
                </pl-button>
            </header>

            <header class="horizontal padded center-aligning layout" ?hidden=${!this.multiSelect}>
                <pl-button class="slim transparent" @click=${() => this.cancelMultiSelect()}>
                    <pl-icon icon="cancel"></pl-icon>
                </pl-button>

                <pl-button
                    class="slim transparent"
                    @click=${() => (this._multiSelect.size ? this.clearSelection() : this.selectAll())}
                >
                    <pl-icon icon="checkall"> </pl-icon>
                </pl-button>

                <div class="stretch ellipsis text-centering">
                    ${$l("{0} items selected", this._multiSelect.size.toString())}
                </div>

                <pl-button class="slim transparent" @click=${() => this._moveItems()}>
                    <pl-icon icon="share"></pl-icon>
                </pl-button>

                <pl-button class="slim transparent" @click=${() => this._deleteItems()}>
                    <pl-icon icon="delete"></pl-icon>
                </pl-button>
            </header>

            <main>
                <pl-virtual-list
                    itemSelector=".list-item"
                    role="listbox"
                    class="fullbleed"
                    .data=${this._listItems}
                    .renderItem=${(item: ListItem, i: number) => this._renderItem(item, i)}
                    .guard=${({ item, vault }: ListItem) => [
                        item.name,
                        item.tags,
                        item.fields,
                        vault,
                        item.id === this.selected,
                        this.multiSelect,
                        this._multiSelect.has(item.id),
                    ]}
                ></pl-virtual-list>

                <div class="empty-placeholder" ?hidden=${!placeholder.text}>
                    <pl-icon icon="${placeholder.icon}"></pl-icon>

                    <div>${placeholder.text}</div>
                </div>
            </main>
        `;
    }

    @listen("resize", window)
    _resizeHandler() {
        delete this._cachedBounds;
    }
    //
    // private _scrollToIndex(i: number) {
    //     const el = this.$(`pl-item-item[index="${i}"]`);
    //     if (el) {
    //         this._main.scrollTop = el.offsetTop - 6;
    //     }
    // }
    //
    // private _scrollToSelected() {
    //     const selected = this._selected.values()[0];
    //     const i = this._listItems.indexOf(selected);
    //     if (i !== -1 && (i < this._firstVisibleIndex || i > this._lastVisibleIndex)) {
    //         this._scrollToIndex(i);
    //     }
    // }

    // private async _animateItems(delay = 100) {
    //     await this.updateComplete;
    //     this._main.style.opacity = "0";
    //     setTimeout(() => {
    //         this._scrollHandler();
    //         const elements = Array.from(this.$$(".list-item"));
    //         const animated = elements.slice(this._firstVisibleIndex, this._lastVisibleIndex + 1);
    //
    //         animateCascade(animated, { clear: true });
    //         this._main.style.opacity = "1";
    //     }, delay);
    // }

    private async _deleteItems() {
        let selected = [...this._multiSelect.values()];

        if (selected.some(({ vault }) => !app.hasWritePermissions(vault))) {
            const proceed = await confirm(
                $l(
                    "Some items in your selection are from Vaults you don't have write access " +
                        "to and cannot be deleted. Do you want to proceed deleting the other items?"
                ),
                $l("Yes"),
                $l("No")
            );
            if (!proceed) {
                return;
            }
            selected = selected.filter(({ vault }) => app.hasWritePermissions(vault));
        }

        const confirmed = await confirm(
            $l("Are you sure you want to delete these items? This action can not be undone!"),
            $l("Delete {0} Items", selected.length.toString()),
            $l("Cancel"),
            { type: "destructive" }
        );
        if (confirmed) {
            await app.deleteItems(selected.map((i) => i.item));
            this.cancelMultiSelect();
        }
    }

    private async _moveItems() {
        let selected = [...this._multiSelect.values()];
        if (selected.some(({ item }) => !!item.attachments.length)) {
            const proceed = await confirm(
                $l(
                    "Some items in your selection have attachments and cannot be moved. " +
                        "Do you want to proceed moving the other items?"
                ),
                $l("Yes"),
                $l("No")
            );
            if (!proceed) {
                return;
            }
            selected = selected.filter(({ item }) => !item.attachments.length);
        }

        if (selected.some(({ vault }) => !app.hasWritePermissions(vault))) {
            const proceed = await confirm(
                $l(
                    "Some items in your selection are from Vaults you don't have write " +
                        "access to and cannot be moved. Do you want to proceed moving the other items?"
                ),
                $l("Yes"),
                $l("No")
            );
            if (!proceed) {
                return;
            }
            selected = selected.filter(({ vault }) => app.hasWritePermissions(vault));
        }

        const movedItems = await this._moveItemsDialog.show(selected);
        if (movedItems) {
            this.cancelMultiSelect();
        }
    }

    private _copyField({ item }: ListItem, index: number, e: Event) {
        e.stopPropagation();
        setClipboard(item, item.fields[index]);
        const fieldEl = e.target as HTMLElement;
        fieldEl.classList.add("copied");
        setTimeout(() => fieldEl.classList.remove("copied"), 1000);
        app.updateLastUsed(item);
        this.dispatch("field-clicked", { item, index });
    }

    private async _dragFieldStart({ item }: ListItem, index: number, event: DragEvent) {
        this.dispatch("field-dragged", { item, index, event });
        return true;
    }

    private _openAttachment(a: AttachmentInfo, item: VaultItem, e: MouseEvent) {
        e.stopPropagation();
        this._attachmentDialog.show({ info: a, item: item.id });
    }

    private _getItems(): ListItem[] {
        const { vault: vaultId, tag, favorites, attachments, recent, host } = this.filter || {};
        const filter = (this._filterInput && this._filterInput.value) || "";
        const recentThreshold = new Date(Date.now() - app.settings.recentLimit * 24 * 60 * 60 * 1000);

        let items: ListItem[] = [];

        if (host) {
            items = this.app.getItemsForHost(this.app.state.currentHost);
        } else {
            for (const vault of this.state.vaults) {
                // Filter by vault
                if (vaultId && vault.id !== vaultId) {
                    continue;
                }

                for (const item of vault.items) {
                    if (
                        // filter by tag
                        (!tag || item.tags.includes(tag)) &&
                        (!favorites || app.account!.favorites.has(item.id)) &&
                        (!attachments || !!item.attachments.length) &&
                        (!recent ||
                            (app.state.lastUsed.has(item.id) && app.state.lastUsed.get(item.id)! > recentThreshold)) &&
                        filterByString(filter || "", item)
                    ) {
                        items.push({
                            vault,
                            item,
                            section: "",
                            firstInSection: false,
                            lastInSection: false,
                        });
                    }
                }
            }
        }

        items.sort((a, b) => {
            const x = a.item.name.toLowerCase();
            const y = b.item.name.toLowerCase();
            return x > y ? 1 : x < y ? -1 : 0;
        });

        return items;
    }

    private _renderItem(li: ListItem, index: number) {
        const { item, vault, warning } = li;
        const tags = [];

        if (!this.filter || (!this.filter.vault && app.mainVault && vault.id !== app.mainVault.id)) {
            tags.push({ name: vault.name, icon: "", class: "highlight" });
        }

        if (warning) {
            tags.push({ icon: "error", class: "warning", name: "" });
        }

        if (item.tags.length === 1) {
            const t = item.tags.find((t) => t === router.params.tag) || item.tags[0];
            tags.push({
                name: t,
                class: "",
            });
        } else if (item.tags.length) {
            tags.push({
                icon: "tag",
                name: item.tags.length.toString(),
                class: "",
            });
        }

        const attCount = (item.attachments && item.attachments.length) || 0;
        if (attCount) {
            tags.push({
                name: attCount.toString(),
                icon: "attachment",
                class: "",
            });
        }

        if (app.account!.favorites.has(item.id)) {
            tags.push({
                name: "",
                icon: "favorite",
                class: "warning",
            });
        }

        const selected = item.id === this.selected;

        return html`
            <div
                role="option"
                ?aria-selected=${selected}
                aria-label="${item.name}"
                class="padded horizontally-margined list-item center-aligning spacing horizontal layout click ${!selected &&
                !!index
                    ? "border-top"
                    : ""}"
                @click="${() => this.selectItem(li)}}"
            >
                ${cache(
                    this.multiSelect
                        ? html`
                              <div
                                  class="item-check"
                                  ?hidden=${!this.multiSelect}
                                  ?checked=${this._multiSelect.has(item.id)}
                              ></div>
                          `
                        : ""
                )}

                <div class="stretch collapse">
                    <div class="horizontal center-aligning layout item-header">
                        <div class="stretch ellipsis semibold" ?disabled=${!item.name}>
                            ${item.name || $l("No Name")}
                        </div>

                        <div class="tiny tags">
                            ${tags.map(
                                (tag) => html`
                                    <div class="tag ${tag.class}">
                                        ${tag.icon ? html` <pl-icon icon="${tag.icon}"></pl-icon> ` : ""}
                                        ${tag.name ? html` <div class="tag-name ellipsis">${tag.name}</div> ` : ""}
                                    </div>
                                `
                            )}
                        </div>
                    </div>

                    <div class="item-fields">
                        ${item.fields.map((f: Field, i: number) => {
                            return html`
                                <div
                                    class="item-field hover click"
                                    @click=${(e: MouseEvent) => this._copyField(li, i, e)}
                                    draggable="true"
                                    @dragstart=${(e: DragEvent) => this._dragFieldStart(li, i, e)}
                                >
                                    <div class="item-field-label">
                                        <div
                                            class="small horizontal spacing center-aligning layout item-field-name ellipsis"
                                        >
                                            <pl-icon class="small" icon="${f.icon}"></pl-icon>
                                            <div>${f.name || $l("Unnamed")}</div>
                                        </div>
                                        ${f.type === "totp"
                                            ? html`<pl-totp class="item-field-value" .secret=${f.value}></pl-totp>`
                                            : f.value
                                            ? html` <div class="item-field-value">${f.format(true)}</div>`
                                            : html`<div class="item-field-value faded">[${$l("empty")}]</div>`}
                                    </div>

                                    <div class="copied-message">${$l("copied")}</div>
                                </div>
                            `;
                        })}
                        ${item.attachments.map(
                            (a) => html`
                                <div
                                    class="item-field hover click"
                                    @click=${(e: MouseEvent) => this._openAttachment(a, item, e)}
                                >
                                    <div class="item-field-label">
                                        <div
                                            class="small horizontal spacing center-aligning layout item-field-name ellipsis"
                                        >
                                            <pl-icon class="small" icon="attachment"></pl-icon>
                                            <div>${a.name}</div>
                                        </div>
                                        <div class="item-field-value horizontal center-aligning spacing layout">
                                            <pl-icon icon=${fileIcon(a.type)} class="small"></pl-icon>
                                            <span>${fileSize(a.size)}</span>
                                        </div>
                                    </div>
                                </div>
                            `
                        )}
                        ${cache(
                            !item.fields.length && !item.attachments.length
                                ? html`
                                      <div class="item-field" disabled ?hidden=${!!item.fields.length}>
                                          <div class="item-field-label">
                                              <div class="item-field-name">${$l("No Fields")}</div>
                                              <div class="item-field-value">${$l("This item has no fields.")}</div>
                                          </div>
                                      </div>
                                  `
                                : ""
                        )}
                    </div>
                </div>
            </div>
        `;
    }
}
