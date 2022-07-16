import { css, customElement, html, LitElement, property } from "lit-element";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { shared, content } from "../styles";
import "./button";
import "./icon";
import "./list";
import "./popover";
import { htmlToMarkdown, markdownToHtml } from "../lib/markdown";

@customElement("pl-rich-input")
export class RichInput extends LitElement {
    get value() {
        const html = this._editor.getHTML();
        const md = htmlToMarkdown(html);
        return md;
    }

    set value(content: string) {
        const html = markdownToHtml(content).replace(/\n/g, "");
        this._editor.commands.clearContent();
        this._editor.commands.insertContent(html);
    }

    @property({ type: Boolean })
    isFullscreen = false;

    private _editor = new Editor({
        extensions: [StarterKit],
        onTransaction: () => {
            this.requestUpdate();
            this.dispatchEvent(new CustomEvent("input"));
        },
        onFocus: () => this.classList.add("focused"),
        onBlur: () => this.classList.remove("focused"),
    });

    firstUpdated() {
        this.renderRoot.querySelector(".container")!.append(this._editor.options.element);
        this.addEventListener("click", () => this._editor.commands.focus());
    }

    focus() {
        this._editor.commands.focus();
    }

    static styles = [
        shared,
        content,
        css`
            :host {
                position: relative;
                cursor: text;
                border: solid 1px var(--color-shade-1);
                border-radius: 0.5em;
                display: flex;
                flex-direction: column;
            }

            :host(.focused) {
                border-color: var(--color-highlight);
            }
        `,
    ];

    render() {
        return html`
            <div class="small padded half-spacing wrapping horizontal layout border-bottom">
                <pl-button class="transparent slim">
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
                >
                    <pl-icon icon="bold"></pl-icon>
                </pl-button>

                <pl-button
                    class="transparent slim"
                    .toggled=${this._editor?.isActive("italic")}
                    @click=${() => this._editor.chain().focus().toggleItalic().run()}
                >
                    <pl-icon icon="italic"></pl-icon>
                </pl-button>

                <pl-button
                    class="transparent slim"
                    .toggled=${this._editor?.isActive("strike")}
                    @click=${() => this._editor.chain().focus().toggleStrike().run()}
                >
                    <pl-icon icon="strikethrough"></pl-icon>
                </pl-button>

                <div class="border-left"></div>

                <pl-button
                    class="transparent slim"
                    .toggled=${this._editor?.isActive("bulletList")}
                    @click=${() => this._editor.chain().focus().toggleBulletList().run()}
                >
                    <pl-icon icon="list"></pl-icon>
                </pl-button>

                <pl-button
                    class="transparent slim"
                    .toggled=${this._editor?.isActive("orderedList")}
                    @click=${() => this._editor.chain().focus().toggleOrderedList().run()}
                >
                    <pl-icon icon="list-ol"></pl-icon>
                </pl-button>

                <pl-button
                    class="transparent slim"
                    .toggled=${this._editor?.isActive("blockquote")}
                    @click=${() => this._editor.chain().focus().toggleBlockquote().run()}
                >
                    <pl-icon icon="blockquote"></pl-icon>
                </pl-button>

                <div class="border-left"></div>

                <pl-button
                    class="transparent slim"
                    @click=${() => this._editor.chain().focus().setHorizontalRule().run()}
                >
                    <pl-icon icon="line"></pl-icon>
                </pl-button>

                <div class="stretch"></div>

                <pl-button
                    class="transparent slim"
                    @click=${() => this.dispatchEvent(new CustomEvent("toggle-fullscreen"))}
                >
                    <pl-icon icon="${this.isFullscreen ? "collapse" : "expand"}"></pl-icon>
                </pl-button>
            </div>
            <div class="double-padded container scroller stretch" @click=${(e: Event) => e.stopPropagation()}></div>
        `;
    }
}
