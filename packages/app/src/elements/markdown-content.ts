import { css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { mardownToHtml } from "../lib/markdown";
import { shared } from "../styles";

@customElement("pl-markdown-content")
export class MarkdownContent extends LitElement {
    @property()
    content = "";

    static styles = [
        shared,
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

            button {
                padding: 0.5em;
                background: var(--shade-1);
                border-radius: 0.5em;
            }
        `,
    ];

    render() {
        return mardownToHtml(this.content);
    }
}
