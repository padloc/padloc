import { sanitize } from "dompurify";
import marked from "marked";
import { unsafeHTML } from "lit/directives/unsafe-html";
import { html } from "lit";

export function mardownToHtml(md: string, san = true) {
    let markup = marked(md, {
        headerIds: false,
    });
    if (san) {
        markup = sanitize(markup);
    }
    return html`${unsafeHTML(markup)}`;
}
