import { openExternalUrl } from "@padloc/core/src/platform";
import { sanitize } from "dompurify";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { mardownToHtml } from "../lib/markdown";
import { mixins, shared } from "../styles";
import { icons } from "../styles/icons";

@customElement("pl-rich-content")
export class RichContent extends LitElement {
    @property()
    content = "";

    type: "plain" | "markdown" | "html" = "markdown";

    @property({ type: Boolean })
    sanitize = true;

    static styles = [
        shared,
        icons,
        css`
            h1 {
                font-size: var(--font-size-big);
                font-weight: 600;
            }

            h2 {
                font-size: var(--font-size-large);
                font-weight: bold;
            }

            h3 {
                font-size: var(--font-size-default);
                font-weight: bold;
            }

            p {
                margin-bottom: 0.5em;
            }

            ul {
                list-style: disc;
                padding-left: 1.5em;
                margin-bottom: 0.5em;
            }

            ul.plain {
                list-style: none;
                padding: 0;
            }

            button {
                position: relative;
                box-sizing: border-box;
                padding: var(--button-padding, 0.7em);
                background: var(--button-background);
                color: var(--button-color, currentColor);
                border-width: var(--button-border-width);
                border-style: var(--button-border-style);
                border-color: var(--button-border-color);
                border-radius: var(--button-border-radius, 0.5em);
                font-weight: inherit;
                text-align: inherit;
                transition: transform 0.2s cubic-bezier(0.05, 0.7, 0.03, 3) 0s;
                --focus-outline-color: var(--button-focus-outline-color);
                box-shadow: var(--button-shadow);
            }

            button.primary {
                background: var(--button-primary-background, var(--button-background));
                color: var(--button-primary-color, var(--button-color));
            }

            a.plain {
                text-decoration: none !important;
            }

            ${mixins.click("button")};
            ${mixins.hover("button")};
        `,
    ];

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
                return mardownToHtml(this.content, this.sanitize);
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
