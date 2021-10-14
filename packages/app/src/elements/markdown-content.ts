import { css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { mardownToHtml } from "../lib/markdown";
import { mixins, shared } from "../styles";
import { icons } from "../styles/icons";

@customElement("pl-markdown-content")
export class MarkdownContent extends LitElement {
    @property()
    content = "";

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

            a.plain {
                text-decoration: none !important;
            }

            ${mixins.click("button")};
            ${mixins.hover("button")};
        `,
    ];

    render() {
        return mardownToHtml(this.content);
    }
}
