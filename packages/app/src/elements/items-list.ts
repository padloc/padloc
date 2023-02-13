import { VaultItem, Field, Tag, AuditType, FieldType } from "@padloc/core/src/item";
import { Vault, VaultID } from "@padloc/core/src/vault";
import { translate as $l } from "@padloc/locale/src/translate";
import { debounce, wait, escapeRegex, truncate } from "@padloc/core/src/util";
import { AttachmentInfo } from "@padloc/core/src/attachment";
import { StateMixin } from "../mixins/state";
import { setClipboard } from "../lib/clipboard";
import { app, router } from "../globals";
import { dialog, confirm } from "../lib/dialog";
import { mixins, shared } from "../styles";
import { fileIcon, fileSize } from "../lib/util";
import { Input } from "./input";
import { MoveItemsDialog } from "./move-items-dialog";
import { AttachmentDialog } from "./attachment-dialog";
import "./icon";
import "./virtual-list";
import "./totp";
import "./button";
import { customElement, property, query, queryAll, state } from "lit/decorators.js";
import { css, html, LitElement } from "lit";
import { cache } from "lit/directives/cache.js";
import { Button } from "./button";
import "./item-icon";
import { iconForAudit, noItemsTextForAudit, titleTextForAudit } from "../lib/audit";
import { singleton } from "../lib/singleton";
import { NoteDialog } from "./note-dialog";
import { ImportDialog } from "./import-dialog";

export interface ListItem {
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
    report?: AuditType;
}

function filterByString(fs: string, rec: VaultItem) {
    if (!fs) {
        return true;
    }
    const content = [rec.name, ...rec.tags, ...rec.fields.map((f) => f.name), ...rec.fields.map((f) => f.value)]
        .join(" ")
        .toLowerCase();
    const searchTerms = escapeRegex(fs.toLowerCase()).split(" ").filter(Boolean);

    return searchTerms.every((searchTerm) => content.includes(searchTerm));
}

@customElement("pl-vault-item-list-item")
export class VaultItemListItem extends LitElement {
    @property({ attribute: false })
    item: VaultItem;

    @property({ attribute: false })
    vault: Vault;

    @property()
    warning?: string | boolean;

    @property({ attribute: false })
    selected?: boolean;

    @state()
    private _canScrollRight = false;

    @state()
    private _canScrollLeft = false;

    @dialog("pl-attachment-dialog")
    private _attachmentDialog: AttachmentDialog;

    @query(".item-fields")
    private _scroller: HTMLDivElement;

    @queryAll(".item-field")
    private _fields: NodeListOf<HTMLDivElement>;

    @query(".move-left-button")
    private _moveLeftButton: Button;

    @query(".move-right-button")
    private _moveRightButton: Button;

    @singleton("pl-note-dialog")
    private _noteDialog: NoteDialog;

    updated() {
        this._scroll();
    }

    private _scroll() {
        const { scrollLeft, scrollWidth, offsetWidth } = this._scroller;
        this._canScrollLeft = scrollLeft > 8;
        this._canScrollRight = scrollLeft < scrollWidth - offsetWidth - 8;
    }

    private _moveLeft(e: Event) {
        e.stopPropagation();
        const { scrollLeft } = this._scroller;
        const field = [...this._fields].reverse().find(({ offsetLeft }) => offsetLeft < scrollLeft);
        const { offsetLeft: buttonLeft } = this._moveRightButton;
        this._scroller.scrollLeft = field ? field.offsetLeft + field.offsetWidth - buttonLeft : 0;
    }

    private _moveRight(e: Event) {
        e.stopPropagation();
        const { scrollLeft, offsetWidth: scrollerWidth, offsetLeft: scrollerLeft } = this._scroller;
        const field = [...this._fields].find(
            ({ offsetLeft, offsetWidth }) => offsetLeft + offsetWidth > scrollerWidth + scrollLeft
        );
        const { offsetLeft: buttonLeft, offsetWidth: buttonWidth } = this._moveLeftButton;
        this._scroller.scrollLeft = field ? field.offsetLeft - buttonLeft - buttonWidth + scrollerLeft : 0;
    }

    private async _copyField({ item }: ListItem, index: number, e: Event) {
        e.stopPropagation();

        const field = item.fields[index];

        if (field.type === FieldType.Note) {
            const value = await this._noteDialog.show(field.value);
            if (value !== field.value) {
                field.value = value;
                await app.updateItem(item, { fields: item.fields });
            }
            return;
        }

        setClipboard(await field.transform(), `${item.name} / ${field.name}`);
        const fieldEl = e.target as HTMLElement;
        fieldEl.classList.add("copied");
        setTimeout(() => fieldEl.classList.remove("copied"), 1000);
        app.updateLastUsed(item);
        this.dispatchEvent(
            new CustomEvent("field-clicked", { detail: { item, index }, composed: true, bubbles: true })
        );
    }

    private async _dragFieldStart({ item }: ListItem, index: number, event: DragEvent) {
        this.dispatchEvent(
            new CustomEvent("field-dragged", { detail: { item, index, event }, composed: true, bubbles: true })
        );
        app.updateLastUsed(item);
        return true;
    }

    private _openAttachment(a: AttachmentInfo, item: VaultItem, e: MouseEvent) {
        e.stopPropagation();
        this._attachmentDialog.show({ info: a, item: item.id });
    }

    static styles = [
        shared,
        css`
            :host {
                display: block;
                pointer-events: none;
                padding: 0.5em;
            }

            .item-header {
                margin: 0.25em 0 0 0.5em;
            }

            .item-fields {
                position: relative;
                display: flex;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                /* scroll-snap-type: x proximity; */
                /* scroll-padding: 1em; */
                scroll-behavior: smooth;
                pointer-events: auto;
                padding: 0 0.5em 0 3em;
                margin: 0.25em -0.5em 0 -0.5em;
            }

            .item-field {
                cursor: pointer;
                position: relative;
                flex: 1;
                border-radius: 0.5em;
                max-width: calc(60%);
                opacity: 0.999;
                font-size: var(--font-size-small);
                border-style: var(--items-list-item-field-border-style, solid);
                border-width: var(--items-list-item-field-border-width, 1px);
                border-color: var(--items-list-item-field-border-color, var(--border-color));
                /* scroll-snap-align: start end; */
            }

            .item-field:not(:last-child) {
                margin-right: var(--items-list-field-spacing, var(--spacing));
            }

            .item-field.dragging {
                background: var(--color-background);
                color: var(--color-foreground);
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
                ${mixins.fullbleed()};
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
                font-weight: var(--items-list-item-field-name-weight, 400);
                text-transform: uppercase;
                margin-bottom: 0.2em;
                ${mixins.ellipsis()};
            }

            .item-field-value {
                font-weight: var(--items-list-item-field-value-weight, 400);
                ${mixins.ellipsis()};
            }

            .item-field-value > * {
                vertical-align: middle;
            }

            .move-left-button,
            .move-right-button {
                position: absolute;
                top: 0;
                bottom: 0;
                margin: auto;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1;
                pointer-events: auto;
                --button-background: var(--color-background);
                --button-border-style: solid;
                --button-border-color: var(--color-foreground);
                --button-border-width: 1px;
                --button-shadow: rgba(0, 0, 0, 0.5) 0 1px 2px -1px;
            }

            .move-left-button {
                left: 0;
            }

            .move-right-button {
                right: 0;
            }

            .tag.ellipsis {
                max-width: 10em;
            }

            :host(:not(:hover)) .move-left-button,
            :host(:not(:hover)) .move-right-button {
                visibility: hidden;
            }

            :host(.none-interactive) * {
                pointer-events: none !important;
            }
        `,
    ];

    render() {
        const { item, vault, warning } = this;
        const tags = [];

        // const name = vault.getLabel();

        if (warning) {
            tags.push({ icon: "error", class: "warning", name: "" });
        }

        if (item.tags.length) {
            tags.push({
                icon: "tag",
                name: item.tags[0],
                class: "",
            });

            if (item.tags.length > 1) {
                tags.push({
                    icon: "tags",
                    name: `+${item.tags.length - 1}`,
                    class: "",
                });
            }
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

        // tags.push({ name, icon: "vault", class: "highlight" });

        return html`
            <div class="item-header spacing center-aligning horizontal layout">
                <div class="large">
                    ${this.selected === true
                        ? html` <pl-icon icon="checkbox-checked"></pl-icon> `
                        : this.selected === false
                        ? html` <pl-icon icon="checkbox-unchecked" class="faded"></pl-icon> `
                        : html` <pl-item-icon .item=${item}></pl-item-icon> `}
                </div>

                <div class="stretch collapse left-half-margined">
                    <div class="tiny subtle">${vault.label}</div>
                    <div class="ellipsis semibold" ?disabled=${!item.name}>${item.name || $l("New Item")}</div>
                </div>

                ${tags.map(
                    (tag) => html`
                        <div class="tiny tag ${tag.class} ellipsis" style="align-self: start">
                            ${tag.icon ? html`<pl-icon icon="${tag.icon}" class="inline"></pl-icon>` : ""}
                            ${tag.name ? html`${tag.name}` : ""}
                        </div>
                    `
                )}
            </div>

            <div class="relative">
                <pl-button
                    class="small round skinny move-left-button"
                    ?invisible=${!this._canScrollLeft}
                    @click=${this._moveLeft}
                >
                    <pl-icon icon="arrow-left"></pl-icon>
                </pl-button>

                <pl-button
                    class="small round skinny move-right-button"
                    ?invisible=${!this._canScrollRight}
                    @click=${this._moveRight}
                >
                    <pl-icon icon="arrow-right"></pl-icon>
                </pl-button>

                <div class="item-fields hide-scrollbar" @scroll=${this._scroll}>
                    ${item.fields.map((f: Field, i: number) => {
                        return html`
                            <div
                                class="item-field hover click"
                                @click=${(e: MouseEvent) => this._copyField({ vault, item }, i, e)}
                                draggable="true"
                                @dragstart=${(e: DragEvent) => this._dragFieldStart({ vault, item }, i, e)}
                            >
                                <div class="item-field-label">
                                    <div class="tiny item-field-name ellipsis">
                                        <pl-icon class="inline" icon="${f.icon}"></pl-icon>
                                        ${f.name || $l("Unnamed")}
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
                                    <div class="tiny item-field-name ellipsis">
                                        <pl-icon class="inline" icon="attachment"></pl-icon>
                                        ${a.name}
                                    </div>
                                    <div class="item-field-value">
                                        <pl-icon icon=${fileIcon(a.type)} class="small inline"></pl-icon>
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
                                          <div class="tiny item-field-name">${$l("No Fields")}</div>
                                          <div class="item-field-value">${$l("This item has no fields.")}</div>
                                      </div>
                                  </div>
                              `
                            : ""
                    )}
                </div>
            </div>
        `;
    }
}

@customElement("pl-items-list")
export class ItemsList extends StateMixin(LitElement) {
    @property()
    selected: string = "";

    @property({ type: Boolean })
    multiSelect: boolean = false;

    @property({ attribute: false })
    filter?: ItemsFilter;

    @state()
    private _listItems: ListItem[] = [];
    // @property()
    // private _firstVisibleIndex: number = 0;
    // @property()
    // private _lastVisibleIndex: number = 0;

    // @query("#main")
    // private _main: HTMLElement;
    @query("#filterInput")
    private _filterInput: Input;

    @state()
    private _filterShowing: boolean = false;

    // private _cachedBounds: DOMRect | ClientRect | null = null;
    // private _selected = new Map<string, ListItem>();

    @dialog("pl-move-items-dialog")
    private _moveItemsDialog: MoveItemsDialog;

    @dialog("pl-import-dialog")
    private _importDialog: ImportDialog;

    private _multiSelect = new Map<string, ListItem>();

    private _updateItems = debounce(() => {
        this._listItems = this._getItems();
    }, 50);

    private _updateFilterParam() {
        const { search, ...params } = router.params;
        if (this._filterInput.value) {
            params.search = this._filterInput.value;
        }
        router.go(router.path, params, true);
    }

    private get _selectedVault() {
        return (this.filter?.vault && app.getVault(this.filter.vault)) || null;
    }

    private get _canCreateItems() {
        const vault = this._selectedVault;
        return vault ? app.isEditable(vault) : app.vaults.some((v) => app.isEditable(v));
    }

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

    updated(changes: Map<string, any>) {
        if (changes.has("filter")) {
            this.stateChanged();
        }
    }

    async search(val?: string, focus = true) {
        this._filterShowing = true;
        await this.updateComplete;
        setTimeout(() => {
            if (val && val !== this._filterInput.value) {
                this._filterInput.value = val;
                this._updateItems();
            }
            if (focus) {
                this._filterInput.focus();
            }
        }, 100);
    }

    cancelSearch() {
        this._filterInput?.blur();
        this._filterShowing = false;
        if (this._filterInput?.value) {
            this._filterInput.value = "";
            this._updateFilterParam();
            this._updateItems();
        }
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

    // firstUpdated() {
    //     this._resizeHandler();
    // }

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

            .header-icon {
                height: 1.3em;
            }

            main {
                position: relative;
                flex: 1;
            }

            .list-item {
                --list-item-border-color: var(--items-list-item-border-color);
                /* overflow: hidden; */
                border-bottom: solid 1px var(--list-item-border-color);
            }

            .list-item[aria-selected="true"] {
                overflow: hidden;
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
                ${mixins.fullbleed()};
                background: var(--color-favorite);
                border-radius: inherit;
                transition: transform 0.2s, opacity 0.2s;
                transition-timing-function: cubic-bezier(1, -0.3, 0, 1.3);
            }

            .item-check:not(.checked)::after {
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
        const { favorites, recent, attachments, host, vault: vaultId, tag, report: audit } = this.filter || {};
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
            : audit
            ? {
                  icon: "audit-pass",
                  text: noItemsTextForAudit(audit),
              }
            : {
                  icon: "vaults",
                  text: $l("You don't have any items yet."),
              };

        const vault = vaultId && app.getVault(vaultId);
        const org = vault && vault.org && app.getOrg(vault.org.id);

        const heading = favorites
            ? { title: $l("Favorites"), superTitle: "", icon: "favorite" }
            : recent
            ? { title: $l("Recently Used"), superTitle: "", icon: "time" }
            : attachments
            ? { title: $l("Attachments"), superTitle: "", icon: "attachment" }
            : host
            ? {
                  title: new URL(this.state.context.browser?.url!).hostname.replace(/^www\./, ""),
                  superTitle: "",
                  icon: "web",
                  iconUrl: this.state.context.browser?.favIconUrl,
              }
            : vault
            ? { title: vault.name, superTitle: org ? org.name : "", icon: "vaults" }
            : tag
            ? { title: tag, superTitle: "", icon: "tags" }
            : audit
            ? { title: titleTextForAudit(audit), superTitle: "", icon: iconForAudit(audit) }
            : { title: $l("All Vaults"), superTitle: "", icon: "vaults" };

        return html`
            <header
                class="padded spacing horizontal center-aligning layout"
                ?hidden=${this.multiSelect || this._filterShowing}
            >
                <pl-button
                    class="transparent skinny stretch menu-button header-title"
                    @click=${() =>
                        this.dispatchEvent(new CustomEvent("toggle-menu", { composed: true, bubbles: true }))}
                >
                    <div
                        class="half-margined fill-horizontally horizontal spacing center-aligning layout text-left-aligning"
                    >
                        ${heading.iconUrl
                            ? html` <img .src=${heading.iconUrl} class="header-icon" /> `
                            : html` <pl-icon icon="${heading.icon}"></pl-icon> `}
                        <div class="stretch collapse ellipsis">
                            ${heading.superTitle
                                ? html`<span class="highlighted">${truncate(heading.superTitle, 10)} / </span>`
                                : ""}${heading.title}
                        </div>
                    </div>
                </pl-button>

                <div class="horizontal layout">
                    <pl-button class="slim transparent" @click=${() => (this.multiSelect = true)}>
                        <pl-icon icon="list-check"></pl-icon>
                    </pl-button>

                    <pl-button
                        class="slim transparent"
                        @click=${() =>
                            this.dispatchEvent(new CustomEvent("create-item", { composed: true, bubbles: true }))}
                        ?disabled=${!this._canCreateItems}
                    >
                        <pl-icon icon="add"></pl-icon>
                    </pl-button>

                    <pl-button class="slim transparent" @click=${() => this.search()} ?hidden=${this._filterShowing}>
                        <pl-icon icon="search"></pl-icon>
                    </pl-button>
                </div>
            </header>

            <header
                class="padded horizontal center-aligning layout"
                ?hidden=${this.multiSelect || !this._filterShowing}
            >
                <pl-input
                    class="slim stretch transparent"
                    .placeholder=${$l("Type To Search")}
                    id="filterInput"
                    select-on-focus
                    @input=${this._updateItems}
                    @escape=${this.cancelSearch}
                    @change=${this._updateFilterParam}
                >
                    <pl-icon slot="before" class="left-margined left-padded subtle small" icon="search"></pl-icon>

                    <pl-button slot="after" class="slim transparent" @mousedown=${() => this.cancelSearch()} >
                        <pl-icon icon="cancel"></pl-icon>
                    </pl-button>
                </pl-input>
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

                <pl-button
                    class="slim transparent"
                    @click=${() => this._moveItems()}
                    ?disabled=${!this._multiSelect.size}
                >
                    <pl-icon icon="share"></pl-icon>
                </pl-button>

                <pl-button
                    class="slim transparent"
                    @click=${() => this._deleteItems()}
                    ?disabled=${!this._multiSelect.size}
                >
                    <pl-icon icon="delete"></pl-icon>
                </pl-button>
            </header>

            <main>
                <pl-virtual-list
                    itemSelector=".list-item"
                    role="listbox"
                    class="fullbleed"
                    .data=${this._listItems}
                    .renderItem=${((item: ListItem, i: number) => this._renderItem(item, i)) as any}
                    .guard=${(({ item, vault }: ListItem) => [
                        item.name,
                        item.tags,
                        item.fields,
                        vault,
                        item.id === this.selected,
                        this.multiSelect,
                        this._multiSelect.has(item.id),
                    ]) as any}
                ></pl-virtual-list>

                <div
                    class="fullbleed centering double-padded text-centering vertical layout"
                    ?hidden=${!placeholder.text}
                >
                    <pl-icon icon=${placeholder.icon || ""} class="enormous thin subtle"></pl-icon>

                    <div class="subtle">${placeholder.text}</div>

                    <div class="double-margined spacing vertical layout" style="min-width: 12em;">
                        <pl-button
                            class="slim ghost"
                            @click=${() =>
                                this.dispatchEvent(new CustomEvent("create-item", { composed: true, bubbles: true }))}
                            ?hidden=${!this._canCreateItems}
                        >
                            <div class="spacing horizontal layout">
                                <pl-icon icon="add"></pl-icon>
                                <div>${$l("New Vault Item")}</div>
                            </div>
                        </pl-button>
                        <pl-button class="slim ghost" @click=${() => this._importDialog.show()}>
                            <div class="spacing horizontal layout">
                                <pl-icon icon="import"></pl-icon>
                                <div>${$l("Import Data")}</div>
                            </div>
                        </pl-button>
                    </div>
                </div>
            </main>
        `;
    }

    // @listen("resize", window)
    // _resizeHandler() {
    //     this._cachedBounds = null;
    // }
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

    private _getItems(): ListItem[] {
        const { vault: vaultId, tag, favorites, attachments, recent, host, report: audit } = this.filter || {};
        const filter = (this._filterInput && this._filterInput.value) || "";
        const recentThreshold = new Date(Date.now() - app.settings.recentLimit * 24 * 60 * 60 * 1000);

        let items: ListItem[] = [];

        if (filter) {
            items = this.state.vaults.flatMap((vault) =>
                [...vault.items].filter((item) => filterByString(filter || "", item)).map((item) => ({ vault, item }))
            );
        } else if (host) {
            items = this.app.getItemsForUrl(this.app.state.context.browser?.url!);
        } else {
            for (const vault of this.state.vaults) {
                // Filter by vault
                if (vaultId && vault.id !== vaultId) {
                    continue;
                }

                for (const item of vault.items) {
                    if (
                        (!tag || item.tags.includes(tag)) &&
                        (!favorites || app.account!.favorites.has(item.id)) &&
                        (!attachments || !!item.attachments.length) &&
                        (!recent ||
                            (app.state.lastUsed.has(item.id) && app.state.lastUsed.get(item.id)! > recentThreshold)) &&
                        (!audit || item.auditResults.some((auditResult) => auditResult.type === audit))
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

    private _renderItem(li: ListItem, _index: number) {
        const { item, vault, warning } = li;
        const multiSelected = this.multiSelect ? this._multiSelect.has(item.id) : undefined;
        const selected = this.multiSelect ? !!multiSelected : item.id === this.selected;

        return html`
            <div
                role="option"
                aria-selected="${selected}"
                aria-label="${item.name}"
                class="list-item center-aligning horizontal layout"
                @click=${() => this.selectItem(li)}
            >
                <div class="fullbleed click" style="border-radius: inherit"></div>
                <pl-vault-item-list-item
                    .item=${item}
                    .vault=${vault}
                    .warning=${warning}
                    .selected=${multiSelected}
                    class="stretch collapse"
                >
                </pl-vault-item-list-item>
            </div>
        `;
    }
}
