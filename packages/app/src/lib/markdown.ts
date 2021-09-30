import { sanitize } from "dompurify";
import marked from "marked";
import { unsafeHTML } from "lit/directives/unsafe-html";
import { html } from "lit";

export function mardownToHtml(md: string) {
    return html`${unsafeHTML(
        sanitize(
            marked(md, {
                headerIds: false,
            })
        )
    )}`;
}
