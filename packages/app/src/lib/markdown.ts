import { addHook, sanitize } from "dompurify";
import { marked } from "marked";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { html } from "lit";

// Add a hook to make all links open a new window
addHook("afterSanitizeAttributes", function (node) {
    // set all elements owning target to target=_blank
    if ("target" in node) {
        node.setAttribute("target", "_blank");
    }
});

export function mardownToHtml(md: string, san = true) {
    let markup = marked(md, {
        headerIds: false,
    });
    if (san) {
        markup = sanitize(markup);
    }
    return html`${unsafeHTML(markup)}`;
}
