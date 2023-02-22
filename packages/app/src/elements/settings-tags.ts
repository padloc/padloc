import "./button";
import "./scroller";
import { html, LitElement } from "lit";
import { StateMixin } from "../mixins/state";
import { router } from "../globals";
import { translate as $l } from "@padloc/locale/src/translate";
import { customElement, state } from "lit/decorators.js";
import { shared } from "../styles";
import "./popover";
import "./icon";
import "./sortable-list";
import "./color-input";
import { ColorInput } from "./color-input";
import { Routing } from "../mixins/routing";
import { TagInfo } from "@padloc/core/src/item";
import { confirm, prompt } from "../lib/dialog";

@customElement("pl-settings-tags")
export class SettingsTags extends Routing(StateMixin(LitElement)) {
    readonly routePattern = /^settings\/tags/;

    @state()
    private _tags: TagInfo[] = [];

    @state()
    private _unlistedTags: TagInfo[] = [];

    private async _renameTag(tag: TagInfo) {
        const newName = await prompt($l("Please enter the new tag name."), {
            title: $l("Rename Tag"),
        });
        await this.app.renameTag(tag.name, newName);
        this._tags = this.app.tags.filter((tag) => !tag.unlisted);
        this._unlistedTags = this.app.tags.filter((tag) => tag.unlisted);
    }

    private async _deleteTag(tag: TagInfo) {
        if (
            !(await confirm(
                $l("Are you sure you want to delete this tag? This will remove it from all vault items."),
                $l("Delete Tag"),
                $l("Cancel"),
                { type: "destructive" }
            ))
        ) {
            return;
        }

        await this.app.deleteTag(tag.name);
        this._tags = this.app.tags.filter((tag) => !tag.unlisted);
        this._unlistedTags = this.app.tags.filter((tag) => tag.unlisted);
    }

    private async _unlistTag(tag: TagInfo) {
        tag.unlisted = true;
        await this._save();
    }

    private async _relistTag(tag: TagInfo) {
        tag.unlisted = false;
        await this._save();
    }

    private async _save() {
        if (!this.app.account) {
            return;
        }
        await this.app.updateAccount(async (account) => {
            account.tags = [...this._tags, ...this._unlistedTags];
            await account.commitSecrets();
        });
        this._tags = this.app.tags.filter((tag) => !tag.unlisted);
        this._unlistedTags = this.app.tags.filter((tag) => tag.unlisted);
    }

    private async _changeColor(tag: TagInfo, color: string) {
        tag.color = color;
        await this._save();
    }

    updated(changes: Map<string, unknown>) {
        if (changes.has("active") && this.active) {
            this._tags = this.app.tags.filter((tag) => !tag.unlisted);
            this._unlistedTags = this.app.tags.filter((tag) => tag.unlisted);
        }
    }

    static styles = [shared];

    render() {
        return html`
            <div class="fullbleed vertical layout stretch background">
                <header class="padded center-aligning horizontal layout">
                    <pl-button class="transparent slim back-button" @click=${() => router.go("settings")}>
                        <pl-icon icon="backward"></pl-icon>
                    </pl-button>
                    <pl-icon icon="tags" class="left-margined vertically-padded wide-only"></pl-icon>
                    <div class="padded stretch ellipsis">${$l("Tags")}</div>
                </header>

                <pl-scroller class="stretch">
                    <div class="double-margined box">
                        <pl-sortable-list
                            .items=${this._tags}
                            @item-moved=${this._save}
                            .renderItem=${(tag: TagInfo, i: number) => html`
                                <div
                                    class="center-aligning horizontal layout ${!!i ? "border-top" : ""}"
                                    style="cursor: grab"
                                >
                                    <pl-color-input
                                        class="margined"
                                        .value=${tag.color}
                                        @change=${(e: Event) => this._changeColor(tag, (e.target as ColorInput).value)}
                                    ></pl-color-input>

                                    <div class="stretch collapse ellipsis">${tag.name}</div>

                                    <div class="subtle tiny tag hide-on-parent-hover double-margined">
                                        <pl-icon class="inline" icon="count"></pl-icon> ${tag.count}
                                    </div>

                                    <pl-button class="slim transparent show-on-parent-hover horizontally-margined">
                                        <pl-icon icon="more"></pl-icon>
                                    </pl-button>

                                    <pl-popover
                                        hide-on-click
                                        hide-on-leave
                                        alignment="bottom-left"
                                        style="min-width: 10em"
                                    >
                                        <pl-list>
                                            <div
                                                class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                                                @click=${() => this._renameTag(tag)}
                                                ?disabled=${!!tag.readonly}
                                            >
                                                <pl-icon icon="edit"></pl-icon>
                                                <div class="ellipsis">${$l("Rename")}</div>
                                            </div>
                                            <div
                                                class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                                                @click=${() => this._deleteTag(tag)}
                                                ?disabled=${!!tag.readonly}
                                            >
                                                <pl-icon icon="delete"></pl-icon>
                                                <div class="ellipsis">${$l("Delete")}</div>
                                            </div>
                                            <div
                                                class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                                                @click=${() => this._unlistTag(tag)}
                                            >
                                                <pl-icon icon="hide"></pl-icon>
                                                <div class="ellipsis">${$l("Unlist")}</div>
                                            </div>
                                        </pl-list>
                                    </pl-popover>
                                </div>
                            `}
                        ></pl-sortable-list>
                    </div>

                    <div class="double-margined box">
                        <h2 class="padded bg-dark border-bottom semibold horizontal center-aligning layout">
                            <div class="uppercase stretch">${$l("Unlisted")}</div>
                            <pl-icon icon="info-round" class="subtle"></pl-icon>
                            <pl-popover trigger="hover" class="small double-padded regular" style="max-width: 20em">
                                ${$l(
                                    "Unlisted tags still show up on vault items but are hidden from the main menu and from suggestions."
                                )}
                            </pl-popover>
                        </h2>

                        ${!this._unlistedTags.length
                            ? html`
                                  <div class="double-padded subtle small">
                                      ${$l("You don't have any unlisted tags.")}
                                  </div>
                              `
                            : ""}

                        <pl-sortable-list
                            .items=${this._unlistedTags}
                            @item-moved=${this._save}
                            .renderItem=${(tag: TagInfo, i: number) => html`
                                <div
                                    class="center-aligning horizontal layout ${!!i ? "border-top" : ""}"
                                    style="cursor: grab"
                                >
                                    <pl-icon icon="hide" style="margin: 0.7em"></pl-icon>

                                    <div class="stretch collapse ellipsis">${tag.name}</div>

                                    <div class="subtle tiny tag hide-on-parent-hover double-margined">
                                        <pl-icon class="inline" icon="count"></pl-icon> ${tag.count}
                                    </div>

                                    <pl-button class="slim transparent show-on-parent-hover horizontally-margined">
                                        <pl-icon icon="more"></pl-icon>
                                    </pl-button>

                                    <pl-popover
                                        hide-on-click
                                        hide-on-leave
                                        alignment="bottom-left"
                                        style="min-width: 10em"
                                    >
                                        <pl-list>
                                            <div
                                                class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                                                @click=${() => this._renameTag(tag)}
                                                ?disabled=${!!tag.readonly}
                                            >
                                                <pl-icon icon="edit"></pl-icon>
                                                <div class="ellipsis">${$l("Rename")}</div>
                                            </div>
                                            <div
                                                class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                                                @click=${() => this._deleteTag(tag)}
                                                ?disabled=${!!tag.readonly}
                                            >
                                                <pl-icon icon="delete"></pl-icon>
                                                <div class="ellipsis">${$l("Delete")}</div>
                                            </div>
                                            <div
                                                class="small double-padded list-item center-aligning spacing horizontal layout hover click"
                                                @click=${() => this._relistTag(tag)}
                                            >
                                                <pl-icon icon="show"></pl-icon>
                                                <div class="ellipsis">${$l("Remove From Unlisted")}</div>
                                            </div>
                                        </pl-list>
                                    </pl-popover>
                                </div>
                            `}
                        ></pl-sortable-list>
                    </div>
                </pl-scroller>
            </div>
        `;
    }
}
