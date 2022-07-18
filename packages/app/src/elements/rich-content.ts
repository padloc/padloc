import { openExternalUrl } from "@padloc/core/src/platform";
import { sanitize } from "dompurify";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { markdownToLitTemplate } from "../lib/markdown";
import { content, shared } from "../styles";
import { icons } from "../styles/icons";

@customElement("pl-rich-content")
export class RichContent extends LitElement {
    @property()
    content = "";

    @property()
    type: "plain" | "markdown" | "html" = "markdown";

    @property({ type: Boolean })
    sanitize = true;

    static styles = [shared, icons, content];

    updated() {
        for (const anchor of [...this.renderRoot.querySelectorAll("a[href]")] as HTMLAnchorElement[]) {
            anchor.addEventListener("click", (e) => {
                e.preventDefault();
                if (anchor.getAttribute("href")?.startsWith("#")) {
                    const el = this.renderRoot.querySelector(anchor.getAttribute("href")!);
                    el?.scrollIntoView();
                } else {
                    openExternalUrl(anchor.href);
                }
            });
        }
    }

    render() {
        switch (this.type) {
            case "markdown":
                return markdownToLitTemplate(this.content, this.sanitize);
            case "html":
                const content = this.sanitize
                    ? sanitize(this.content, { ADD_TAGS: ["pl-icon"], ADD_ATTR: ["icon"] })
                    : this.content;
                return html`${unsafeHTML(content)}`;
            default:
                return html`${this.content}`;
        }
    }
}
