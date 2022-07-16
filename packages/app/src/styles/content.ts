import { css } from "lit";
import { click, hover } from "./mixins";

export const content = css`
    h1 {
        font-size: var(--font-size-big);
        font-weight: bold;
    }

    h2 {
        font-size: var(--font-size-large);
        font-weight: bold;
    }

    h3 {
        font-size: var(--font-size-default);
        font-weight: bold;
    }

    h1,
    h2,
    h3 {
        margin-bottom: 0.5em;
    }

    p:not(:last-child),
    blockquote:not(:last-child) {
        margin-bottom: 0.5em;
    }

    ul,
    ol {
        padding-left: 1.5em;
        margin-bottom: 0.5em;
    }

    ul {
        list-style: disc;
    }

    ol {
        list-style: decimal;
    }

    ul ul,
    ol ol,
    ul ol,
    ol ul {
        margin-bottom: 0;
    }

    ol > li > ol {
        list-style: lower-roman;
    }

    ol > li > ol > li > ol {
        list-style: lower-alpha;
    }

    ul > li > ul {
        list-style: circle;
    }

    ul > li > ul > li > ul {
        list-style: square;
    }

    ul.plain {
        list-style: none;
        padding: 0;
    }

    li p:not(:last-child) {
        margin-bottom: 0;
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

    ${click("button")};
    ${hover("button")};

    a.plain {
        text-decoration: none !important;
    }

    em {
        font-style: italic;
    }

    blockquote {
        border-left: solid 2px var(--color-shade-3);
        padding-left: 0.5em;
    }

    hr {
        border: none;
        border-top: solid 1px var(--color-shade-3);
    }
`;
