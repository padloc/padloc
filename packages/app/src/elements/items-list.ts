import { VaultItem, Field, Tag, FIELD_DEFS } from "@padloc/core/src/item";
import { Vault, VaultID } from "@padloc/core/src/vault";
import { translate as $l } from "@padloc/locale/src/translate";
import { debounce, wait, escapeRegex } from "@padloc/core/src/util";
import { AttachmentInfo } from "@padloc/core/src/attachment";
import { cache } from "lit-html/directives/cache";
import { StateMixin } from "../mixins/state";
import { setClipboard } from "../lib/clipboard";
import { app, router } from "../globals";
import { dialog, confirm } from "../lib/dialog";
import { mixins } from "../styles";
import { fileIcon, fileSize } from "../lib/util";
import { element, html, css, property, query, listen, observe } from "./base";
import { View } from "./view";
import { Input } from "./input";
import { MoveItemsDialog } from "./move-items-dialog";
import { AttachmentDialog } from "./attachment-dialog";
import "./icon";
import "./items-filter";
import "./virtual-list";
import "./totp";

interface ListItem {
    item: VaultItem;
    vault: Vault;
    section?: string;
    firstInSection?: boolean;
    lastInSection?: boolean;
    warning?: boolean;
}

function filterByString(fs: string, rec: VaultItem) {
    if (!fs) {
        return true;
    }
    const content = [rec.name, ...rec.tags, ...rec.fields.map(f => f.name), ...rec.fields.map(f => f.value)]
        .join(" ")
        .toLowerCase();
    return content.search(escapeRegex(fs.toLowerCase())) !== -1;
}

@element("pl-items-list")
export class ItemsList extends StateMixin(View) {
    @property()
    selected: string = "";

    @property()
    multiSelect: boolean = false;

    @property()
    vault: VaultID = "";

    @property()
    tag: Tag = "";

    @property()
    favorites: boolean = false;

    @property()
    attachments: boolean = false;

    @property()
    recent: boolean = false;

    @property()
    host: boolean = false;

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

    @observe("vault")
    @observe("tag")
    @observe("favorites")
    @observe("attachments")
    @observe("recent")
    @observe("host")
    async stateChanged() {
        // Clear items from selection that are no longer in list (due to filtering)
        for (const id of this._multiSelect.keys()) {
            if (!this._listItems.some(i => i.item.id === id)) {
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
            router.go(`items/${item.item.id}`);
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
        ...View.styles,
        css`
            :host {
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                position: relative;
                background: var(--color-quaternary);
                border-radius: var(--border-radius);
            }

            header {
                overflow: visible;
                z-index: 10;
            }

            header pl-input {
                font-size: var(--font-size-default);
                padding: 0 0 0 10px;
            }

            pl-items-filter {
                min-width: 0;
            }

            main {
                padding-bottom: 70px;
                position: relative;
            }

            .section-header {
                grid-column: 1/-1;
                font-weight: bold;
                display: flex;
                align-items: flex-end;
                height: 35px;
                box-sizing: border-box;
                padding: 0 10px 5px 10px;
                background: var(--color-quaternary);
                display: flex;
                z-index: 1;
                position: -webkit-sticky;
                position: sticky;
                top: -3px;
                margin-bottom: -8px;
                font-size: var(--font-size-small);
            }

            .item {
                box-sizing: border-box;
                display: flex;
                align-items: center;
                margin: 6px;
                cursor: pointer;
                /*
                box-shadow: rgba(0, 0, 0, 0.1) 0 1px 8px;
                border: none;
                */
            }

            .item-body {
                flex: 1;
                min-width: 0;
            }

            .item .tags {
                padding: 0;
            }

            .item .tags .tag-name {
                max-width: 60px;
            }

            .item-header {
                height: 24px;
                margin: 12px 12px 8px 12px;
                position: relative;
                display: flex;
                align-items: center;
            }

            .item-name {
                ${mixins.ellipsis()}
                font-weight: 600;
                flex: 1;
                min-width: 0;
                line-height: 24px;
            }

            .item-fields {
                position: relative;
                display: flex;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                padding: 0 0 6px 6px;
            }

            .item-fields::after {
                content: "";
                display: block;
                width: 6px;
                flex: none;
                /*
                position: absolute;
                z-index: 1;
                right: 0;
                top: 0;
                bottom: 0;
                background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1));
                 */
            }

            .item-field {
                cursor: pointer;
                font-size: var(--font-size-tiny);
                position: relative;
                flex: 1;
                border-radius: 8px;
                max-width: calc(60%);
                opacity: 0.999;
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
                color: var(--color-primary);
                text-align: center;
                line-height: 45px;
            }

            .copied-message::before {
                font-family: "FontAwesome";
                content: "\\f00c\\ ";
            }

            .item-field-label {
                padding: 4px 6px;
                pointer-events: none;
            }

            .item-field-name {
                font-size: var(--font-size-micro);
                color: var(--color-primary);
                margin-bottom: 2px;
                font-weight: 600;
                ${mixins.ellipsis()}
                line-height: 16px;
                height: 16px;
            }

            .item-field-name pl-icon {
                font-size: 9px;
                color: var(--color-primary);
                display: inline-block;
                height: 10px;
                width: 10px;
                border-radius: 0;
                position: relative;
                top: 1px;
            }

            .item-field-value {
                font-weight: 600;
                line-height: 19px;
                height: 19px;
                ${mixins.ellipsis()}
            }

            .item-field-value > * {
                vertical-align: middle;
            }

            .item-field.attachment {
                display: flex;
                align-items: center;
            }

            .attachment .file-icon {
                display: inline-block;
                height: 1em;
                width: 1em;
                font-size: 90%;
                border-radius: 0;
                vertical-align: middle;
            }

            .item:focus:not([selected]) {
                border-color: var(--color-highlight);
                color: #4ca8d9;
            }

            .item[selected] {
                background: #e6e6e6;
                border-color: #ddd;
            }

            .item-check {
                position: relative;
                width: 30px;
                height: 30px;
                box-sizing: border-box;
                border: solid 3px transparent;
                background: var(--color-shade-1);
                border-radius: 30px;
                margin: 12px;
                margin-right: 0;
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

            pl-virtual-list {
                padding: 6px;
                padding-bottom: 65px;
                ${mixins.fullbleed()}
                ${mixins.scroll()}
            }
        `
    ];

    render() {
        const placeholder = this._listItems.length
            ? {}
            : this._filterShowing
            ? {
                  icon: "search",
                  text: $l("Your search did not match any items.")
              }
            : this.vault
            ? {
                  icon: "vault",
                  text: $l("This vault does not have any items yet.")
              }
            : this.attachments
            ? {
                  icon: "attachment",
                  text: $l("You don't have any attachments yet.")
              }
            : this.favorites
            ? {
                  icon: "favorite",
                  text: $l("You don't have any favorites yet.")
              }
            : this.recent
            ? {
                  icon: "time",
                  text: $l("You don't have any recently used items!")
              }
            : {
                  icon: "list",
                  text: $l("You don't have any items yet.")
              };
        return html`
            <header>
                <pl-icon
                    icon="menu"
                    class="tap menu-button"
                    @click=${() => this.dispatch("toggle-menu")}
                    ?hidden=${this._filterShowing}
                ></pl-icon>

                <div class="spacer" ?hidden=${this._filterShowing}></div>

                <pl-items-filter
                    .vault=${this.vault}
                    .tag=${this.tag}
                    .favorites=${this.favorites}
                    .recent=${this.recent}
                    .host=${this.host}
                    .attachments=${this.attachments}
                    .searching=${this._filterShowing}
                ></pl-items-filter>

                <div class="spacer" ?hidden=${this._filterShowing}></div>

                <pl-input
                    class="flex"
                    .placeholder=${$l("Type To Search")}
                    id="filterInput"
                    select-on-focus
                    @input=${this._updateItems}
                    @escape=${this.cancelFilter}
                    ?hidden=${!this._filterShowing}
                >
                </pl-input>

                <pl-icon
                    icon="search"
                    class="tap"
                    @click=${() => this.search()}
                    ?hidden=${this._filterShowing}
                ></pl-icon>

                <pl-icon
                    class="tap"
                    icon="cancel"
                    @click=${() => this.cancelFilter()}
                    ?hidden=${!this._filterShowing}
                ></pl-icon>
            </header>

            <main id="main">
                <pl-virtual-list
                    .data=${this._listItems}
                    .minItemWidth=${300}
                    .itemHeight=${111}
                    .renderItem=${(item: ListItem) => this._renderItem(item)}
                    .guard=${({ item, vault }: ListItem) => [
                        item.name,
                        item.tags,
                        item.fields,
                        vault,
                        item.id === this.selected,
                        this.multiSelect,
                        this._multiSelect.has(item.id)
                    ]}
                ></pl-virtual-list>
            </main>

            <div class="empty-placeholder" ?hidden=${!placeholder.text}>
                <pl-icon icon="${placeholder.icon}"></pl-icon>

                <div>${placeholder.text}</div>
            </div>

            <div class="fabs" ?hidden=${this.multiSelect}>
                <pl-icon icon="checked" class="tap fab" @click=${() => (this.multiSelect = true)}></pl-icon>

                <div class="flex"></div>

                <pl-icon icon="add" class="tap fab primary" @click=${() => this.dispatch("create-item")}></pl-icon>
            </div>

            <div class="fabs" ?hidden=${!this.multiSelect}>
                <pl-icon
                    icon="checkall"
                    class="tap fab"
                    @click=${() => (this._multiSelect.size ? this.clearSelection() : this.selectAll())}
                >
                </pl-icon>

                <pl-icon icon="cancel" class="tap fab" @click=${() => this.cancelMultiSelect()}></pl-icon>

                <div class="flex selected-count">${$l("{0} items selected", this._multiSelect.size.toString())}</div>

                <pl-icon icon="share" class="tap fab" @click=${() => this._moveItems()}></pl-icon>

                <pl-icon icon="delete" class="tap fab destructive" @click=${() => this._deleteItems()}></pl-icon>
            </div>
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
            await app.deleteItems(selected);
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

    private _copyField({ vault, item }: ListItem, index: number, e: Event) {
        e.stopPropagation();
        setClipboard(item, item.fields[index]);
        const fieldEl = e.target as HTMLElement;
        fieldEl.classList.add("copied");
        setTimeout(() => fieldEl.classList.remove("copied"), 1000);
        app.updateItem(vault, item, { lastUsed: new Date() });
        this.dispatch("field-clicked", { item, index });
    }

    private _dragFieldStart({ item }: ListItem, index: number, event: DragEvent) {
        // e.preventDefault();
        // this.dispatch("auto-fill", { item, index, dragging: true });
        // const field = item.fields[index];
        // e.dataTransfer!.setData("text/plain", field.value);
        this.dispatch("field-dragged", { item, index, event });
        return true;
    }

    private _openAttachment(a: AttachmentInfo, item: VaultItem, e: MouseEvent) {
        e.stopPropagation();
        this._attachmentDialog.show({ info: a, item: item.id });
    }

    private _getItems(): ListItem[] {
        const { vault: vaultId, tag, favorites, attachments, recent, host } = this;
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
                        (!favorites || (item.favorited && item.favorited.includes(app.account!.id))) &&
                        (!attachments || !!item.attachments.length) &&
                        (!recent || item.lastUsed > recentThreshold) &&
                        filterByString(filter || "", item)
                    ) {
                        items.push({
                            vault,
                            item,
                            section: "",
                            firstInSection: false,
                            lastInSection: false
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

    private _renderItem(li: ListItem) {
        const { item, vault, warning } = li;
        const tags = [];

        if (!this.vault && app.mainVault && vault.id !== app.mainVault.id) {
            tags.push({ name: vault.name, icon: "", class: "highlight" });
        }

        if (warning) {
            tags.push({ icon: "error", class: "warning", name: "" });
        }

        if (item.tags.length === 1) {
            const t = item.tags.find(t => t === router.params.tag) || item.tags[0];
            tags.push({
                name: t,
                class: ""
            });
        } else if (item.tags.length) {
            tags.push({
                icon: "tag",
                name: item.tags.length.toString(),
                class: ""
            });
        }

        const attCount = (item.attachments && item.attachments.length) || 0;
        if (attCount) {
            tags.push({
                name: attCount.toString(),
                icon: "attachment",
                class: ""
            });
        }

        if (item.favorited && item.favorited.includes(app.account!.id)) {
            tags.push({
                name: "",
                icon: "favorite",
                class: "warning"
            });
        }

        return html`
            <div class="item" ?selected=${item.id === this.selected} @click="${() => this.selectItem(li)}}">
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

                <div class="item-body">
                    <div class="item-header">
                        <div class="item-name" ?disabled=${!item.name}>
                            ${item.name || $l("No Name")}
                        </div>

                        <div class="tags small">
                            ${tags.map(
                                tag => html`
                                    <div class="tag ${tag.class}">
                                        ${tag.icon
                                            ? html`
                                                  <pl-icon icon="${tag.icon}"></pl-icon>
                                              `
                                            : ""}
                                        ${tag.name
                                            ? html`
                                                  <div class="tag-name ellipsis">
                                                      ${tag.name}
                                                  </div>
                                              `
                                            : ""}
                                    </div>
                                `
                            )}
                        </div>
                    </div>

                    <div class="item-fields">
                        ${item.fields.map((f: Field, i: number) => {
                            const fieldDef = FIELD_DEFS[f.type] || FIELD_DEFS.text;
                            return html`
                                <div
                                    class="item-field tap"
                                    @click=${(e: MouseEvent) => this._copyField(li, i, e)}
                                    draggable="true"
                                    @dragstart=${(e: DragEvent) => this._dragFieldStart(li, i, e)}
                                >
                                    <div class="item-field-label">
                                        <div class="item-field-name">
                                            <pl-icon icon="${fieldDef.icon}"></pl-icon>
                                            ${f.name || $l("Unnamed")}
                                        </div>
                                        ${f.type === "totp"
                                            ? html`
                                                  <pl-totp class="item-field-value" .secret=${f.value}></pl-totp>
                                              `
                                            : html`
                                                  <div class="item-field-value">
                                                      ${fieldDef.format ? fieldDef.format(f.value, true) : f.value}
                                                  </div>
                                              `}
                                    </div>

                                    <div class="copied-message">${$l("copied")}</div>
                                </div>
                            `;
                        })}
                        ${item.attachments.map(
                            a => html`
                                <div
                                    class="item-field attachment tap"
                                    @click=${(e: MouseEvent) => this._openAttachment(a, item, e)}
                                >
                                    <div class="item-field-label">
                                        <div class="item-field-name ellipsis">
                                            <pl-icon icon="attachment"></pl-icon>
                                            ${a.name}
                                        </div>
                                        <div class="item-field-value">
                                            <pl-icon icon=${fileIcon(a.type)} class="file-icon"></pl-icon>
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
                                              <div class="item-field-name">
                                                  ${$l("No Fields")}
                                              </div>
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
