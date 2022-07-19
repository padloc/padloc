import { addHook, sanitize } from "dompurify";
import { marked } from "marked";
import TurnDown from "turndown";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { html } from "lit";

marked.use({
    renderer: {
        code(content: string) {
            return `<pre><code>${content.replace("\n", "<br>")}</code></pre>`;
        },
    },
});

const turndown = new TurnDown({
    headingStyle: "atx",
    bulletListMarker: "-",
    hr: "---",
    codeBlockStyle: "fenced",
});

turndown.addRule("p", {
    filter: "p",
    replacement: (content, node) => {
        if (node.nextSibling && !["OL", "UL"].includes(node.nextSibling.nodeName)) {
            content = content + "\n\n";
        }
        if (node.previousSibling) {
            content = "\n\n" + content;
        }
        return content;
    },
});

turndown.addRule("strikethrough", {
    filter: ["s"],
    replacement: function (content) {
        return "~" + content + "~";
    },
});

turndown.addRule("li", {
    filter: "li",
    replacement: (content, node, options) => {
        content = content
            .replace(/^\n+/, "") // remove leading newlines
            .replace(/\n+$/, "\n") // replace trailing newlines with just a single one
            .replace(/\n/gm, "\n    "); // indent

        var prefix = options.bulletListMarker + " ";
        var parent = node.parentNode as HTMLElement | null;
        if (parent?.nodeName === "OL") {
            var start = parent.getAttribute("start");
            var index = Array.prototype.indexOf.call(parent.children, node);
            prefix = (start ? Number(start) + index : index + 1) + ". ";
        }
        return prefix + content + (node.nextSibling && !/\n$/.test(content) ? "\n" : "");
    },
});

// turndown.addRule("lists", {
//     filter: ["ul", "ol"],
//     replacement: (content, node) => {
//         const parent = node.parentNode;
//         if (parent.nodeName === "LI" && parent.lastElementChild === node) {
//             return "\n" + content;
//         } else {
//             return "\n\n" + content + "\n\n";
//         }
//     },
// });

// Add a hook to make all links open a new window
addHook("afterSanitizeAttributes", function (node) {
    // set all elements owning target to target=_blank
    if ("target" in node) {
        node.setAttribute("target", "_blank");
    }
});

export function markdownToHtml(md: string, san = true) {
    let markup = marked(md, {
        headerIds: false,
        gfm: true,
        breaks: true,
    });
    if (san) {
        markup = sanitize(markup);
    }
    return markup;
}

export function htmlToMarkdown(html: string) {
    return turndown.turndown(html);
}

export function markdownToLitTemplate(md: string, san = true) {
    const markup = markdownToHtml(md, san);
    return html`${unsafeHTML(markup)}`;
}
