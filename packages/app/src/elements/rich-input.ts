import { css, customElement, html, LitElement, property, query } from "lit-element";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { shared, content } from "../styles";
import "./button";
import "./icon";
import "./list";
import "./popover";
import { htmlToMarkdown, markdownToHtml } from "../lib/markdown";
import { $l } from "@padloc/locale/src/translate";
import "./textarea";
import { Textarea } from "./textarea";
import "./select";
import { customScrollbar } from "../styles/mixins";

@customElement("pl-rich-input")
export class RichInput extends LitElement {
    get value() {
        return this._markdownInput?.value || "";
    }

    set value(md: string) {
        // Disallow updating the value while we're editing
        if (this._editor.isFocused || this._markdownInput?.focused) {
            return;
        }
        const html = markdownToHtml(md).replace(/\n/g, "");
        console.log(md, html);
        this._editor.commands.clearContent();
        this._editor.commands.insertContent(html);
        (async () => {
            await this.updateComplete;
            this._markdownInput.value = md;
        })();
    }

    @property()
    mode: "wysiwyg" | "markdown" = "wysiwyg";

    @property({ type: Boolean })
    isFullscreen = false;

    @query("pl-textarea")
    _markdownInput: Textarea;

    private _editor = new Editor({
        extensions: [StarterKit],
        onTransaction: () => {
            if (this.mode === "wysiwyg") {
                if (this._markdownInput) {
                    this._markdownInput.value = htmlToMarkdown(this._editor.getHTML());
                }
                this.dispatchEvent(new CustomEvent("input"));
                this.requestUpdate();
            }
        },
        onFocus: () => this.classList.add("focused"),
        onBlur: () => this.classList.remove("focused"),
    });

    firstUpdated() {
        this.renderRoot.querySelector(".container")!.append(this._editor.options.element);
        this.addEventListener("click", () => this._editor.commands.focus());
    }

    focus() {
        if (this.mode === "wysiwyg") {
            if (!this._editor.isFocused) {
                this._editor.commands.focus();
            }
        } else {
            if (!this._markdownInput.focused) {
                this._markdownInput.focus();
            }
        }
    }

    private async _toggleMarkdown() {
        if (this.mode === "markdown") {
            this.mode = "wysiwyg";
            await this.updateComplete;
            const html = markdownToHtml(this._markdownInput.value).replace(/\n/g, "");
            this._editor.commands.clearContent();
            this._editor.commands.insertContent(html);
            this._editor.commands.focus();
        } else {
            this.mode = "markdown";
            await this.updateComplete;
            this._markdownInput.updated();
            this._markdownInput.focus();
        }
    }

    static styles = [
        shared,
        content,
        css`
            :host {
                display: block;
                position: relative;
                cursor: text;
                border: solid 1px var(--color-shade-1);
                border-radius: 0.5em;
            }

            :host(.focused) {
                border-color: var(--color-highlight);
            }

            .container {
                min-height: 0;
                overflow-y: auto;
            }

            ${customScrollbar(".container")}

            pl-textarea {
                border: none;
                --input-padding: calc(2 * var(--spacing));
                font-family: var(--font-family-mono);
                font-size: 0.9em;
                line-height: 1.3em;
                min-height: 0;
            }
        `,
    ];

    render() {
        return html`
            <div class="vertical layout fit-vertically">
                <div class="small padded double-spacing horizontal layout border-bottom">
                    <div class="half-spacing wrapping horizontal layout stretch" ?disabled=${this.mode !== "wysiwyg"}>
                        <pl-button class="transparent slim" title="${$l("Text Mode")}">
                            ${this._editor?.isActive("heading", { level: 1 })
                                ? html` <pl-icon icon="heading-1"></pl-icon> `
                                : this._editor?.isActive("heading", { level: 2 })
                                ? html` <pl-icon icon="heading-2"></pl-icon> `
                                : this._editor?.isActive("heading", { level: 3 })
                                ? html` <pl-icon icon="heading-3"></pl-icon> `
                                : html` <pl-icon icon="text"></pl-icon> `}

                            <pl-icon class="small" icon="dropdown"></pl-icon>
                        </pl-button>

                        <pl-popover hide-on-click>
                            <pl-list>
                                <div
                                    class="small double-padded centering horizontal layout list-item hover click"
                                    @click=${() => this._editor.chain().focus().setHeading({ level: 1 }).run()}
                                >
                                    <pl-icon icon="heading-1"></pl-icon>
                                </div>
                                <div
                                    class="small double-padded centering horizontal layout list-item hover click"
                                    @click=${() => this._editor.chain().focus().setHeading({ level: 2 }).run()}
                                >
                                    <pl-icon icon="heading-2"></pl-icon>
                                </div>
                                <div
                                    class="small double-padded centering horizontal layout list-item hover click"
                                    @click=${() => this._editor.chain().focus().setHeading({ level: 3 }).run()}
                                >
                                    <pl-icon icon="heading-3"></pl-icon>
                                </div>
                                <div
                                    class="small double-padded centering horizontal layout list-item hover click"
                                    @click=${() => this._editor.chain().focus().setParagraph().run()}
                                >
                                    <pl-icon icon="text"></pl-icon>
                                </div>
                            </pl-list>
                        </pl-popover>

                        <div class="border-left"></div>

                        <pl-button
                            class="transparent slim"
                            .toggled=${this._editor?.isActive("bold")}
                            @click=${() => this._editor.chain().focus().toggleBold().run()}
                            title="${$l("Bold")}"
                        >
                            <pl-icon icon="bold"></pl-icon>
                        </pl-button>

                        <pl-button
                            class="transparent slim"
                            .toggled=${this._editor?.isActive("italic")}
                            @click=${() => this._editor.chain().focus().toggleItalic().run()}
                            title="${$l("Italic")}"
                        >
                            <pl-icon icon="italic"></pl-icon>
                        </pl-button>

                        <pl-button
                            class="transparent slim"
                            .toggled=${this._editor?.isActive("strike")}
                            @click=${() => this._editor.chain().focus().toggleStrike().run()}
                            title="${$l("Strikethrough")}"
                        >
                            <pl-icon icon="strikethrough"></pl-icon>
                        </pl-button>

                        <div class="border-left"></div>

                        <pl-button
                            class="transparent slim"
                            .toggled=${this._editor?.isActive("bulletList")}
                            @click=${() => this._editor.chain().focus().toggleBulletList().run()}
                            title="${$l("Unordered List")}"
                        >
                            <pl-icon icon="list"></pl-icon>
                        </pl-button>

                        <pl-button
                            class="transparent slim"
                            .toggled=${this._editor?.isActive("orderedList")}
                            @click=${() => this._editor.chain().focus().toggleOrderedList().run()}
                            title="${$l("Ordered List")}"
                        >
                            <pl-icon icon="list-ol"></pl-icon>
                        </pl-button>

                        <pl-button
                            class="transparent slim"
                            .toggled=${this._editor?.isActive("blockquote")}
                            @click=${() => this._editor.chain().focus().toggleBlockquote().run()}
                            title="${$l("Blockquote")}"
                        >
                            <pl-icon icon="blockquote"></pl-icon>
                        </pl-button>

                        <pl-button
                            class="transparent slim"
                            .toggled=${this._editor?.isActive("codeBlock")}
                            @click=${() => this._editor.chain().focus().toggleCodeBlock().run()}
                            title="${$l("Code Block")}"
                        >
                            <pl-icon icon="code"></pl-icon>
                        </pl-button>

                        <div class="border-left"></div>

                        <pl-button
                            class="transparent slim"
                            @click=${() => this._editor.chain().focus().setHorizontalRule().run()}
                            title="${$l("Insert Horizontal Line")}"
                        >
                            <pl-icon icon="line"></pl-icon>
                        </pl-button>
                    </div>
                    <div class="half-spacing left-padded horizontal layout border-left">
                        <pl-select
                            class="slim"
                            .value=${this.mode as any}
                            .options=${[
                                {
                                    label: "WYSIWYG",
                                    value: "wysiwyg",
                                },
                                {
                                    label: "Markdown",
                                    value: "markdown",
                                },
                            ]}
                            hidden
                        ></pl-select>

                        <pl-button
                            class="transparent slim"
                            style="line-height: 1.2em"
                            @click=${() => this._toggleMarkdown()}
                            .toggled=${this.mode === "markdown"}
                        >
                            <div>M</div>
                            <pl-icon icon="markdown"></pl-icon>
                        </pl-button>

                        <pl-button
                            class="transparent slim"
                            @click=${() => this.dispatchEvent(new CustomEvent("toggle-fullscreen"))}
                        >
                            <pl-icon icon="${this.isFullscreen ? "cancel" : "expand"}"></pl-icon>
                        </pl-button>
                    </div>
                </div>
                <div
                    class="double-padded container scroller stretch"
                    @click=${(e: Event) => e.stopPropagation()}
                    ?hidden=${this.mode !== "wysiwyg"}
                ></div>
                <div class="scrolling stretch">
                    <pl-textarea autosize ?hidden=${this.mode !== "markdown"} class="fill-vertically"></pl-textarea>
                </div>
            </div>
        `;
    }
}
