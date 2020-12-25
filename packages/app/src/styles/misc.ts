import { css } from "lit-element";
import * as mixins from "./mixins";

export const misc = css`
    ${mixins.click(".click")}
    ${mixins.hover(".hover")}

    .ellipsis {
        ${mixins.ellipsis()}
    }

    pl-icon[spin] {
        animation: spin 1s infinite;
        transform-origin: center 49%;
    }

    .tags {
        display: flex;
        overflow-x: auto;
        align-items: center;
        -webkit-overflow-scrolling: touch;
    }

    .tags::after {
        content: "";
        display: block;
        width: 1px;
        flex: none;
    }

    .tag {
        font-weight: bold;
        border-radius: 0.5em;
        padding: 0.3em 0.5em;
        text-align: center;
        background: var(--color-foreground);
        color: var(--color-background);
        line-height: 1.4em;
        text-shadow: initial;
    }

    .tag:not(:last-child) {
        margin-right: 0.5em;
    }

    .tag > * {
        display: inline-block;
        vertical-align: top;
    }

    .tag.ghost {
        border: dashed 1px;
        background: transparent;
        color: var(--color-foreground);
    }

    .tag.highlight {
        background: var(--color-highlight);
        color: var(--color-highlight-inverse);
        text-shadow: var(--text-shadow);
    }

    .tag.warning {
        background: var(--color-negative);
        color: var(--color-white);
    }

    .empty-placeholder {
        ${mixins.fullbleed()}
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 20px;
    }

    .empty-placeholder pl-icon {
        width: 100px;
        height: 100px;
        font-size: 50px;
    }

    .empty-placeholder > div {
        width: 300px;
        margin-bottom: 20px;
    }

    .input-wrapper {
        display: flex;
        align-items: center;
        padding: 0 10px;
    }

    .input-wrapper pl-input {
        padding: 0;
        background: transparent;
    }

    .tabs {
        display: flex;
        margin: 0 auto;
        width: auto;
        ${mixins.scroll("horizontal")}
        font-size: var(--font-size-default);
        font-weight: bold;
    }

    .tabs > * {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px 15px;
        border-bottom: solid 3px var(--color-shade-1);
    }

    .tabs > * > pl-icon {
        margin-left: -10px;
        font-size: 90%;
        width: 35px;
        height: 35px;
    }

    .tabs > *[active] {
        color: var(--color-highlight);
        border-color: var(--color-highlight);
    }

    .search-wrapper {
        display: flex;
        align-items: center;
        position: sticky;
        top: var(--gutter-size);
        z-index: 5;
    }

    .search-wrapper pl-icon {
        opacity: 0.5;
        margin-left: 5px;
    }

    .search-wrapper pl-input {
        font-size: var(--font-size-small);
        height: auto;
        flex: 1;
        background: transparent;
        padding-left: 5px;
    }

    .note {
        padding: 0;
        font-size: var(--font-size-small);
        font-weight: bold;
        padding: 8px;
        box-shadow: rgba(0, 0, 0, 0.3) 0 0 3px 0;
        text-shadow: rgba(0, 0, 0, 0.2) 0 2px 0;
        background: var(--color-primary);
    }

    .note.error {
        background: var(--color-negative);
    }

    .font-mono {
        font-family: var(--font-family-mono);
    }

    .border-bottom {
        border-bottom: solid 1px var(--border-color);
    }

    .border-top {
        border-top: solid 1px var(--border-color);
    }

    :not(:hover) > .reveal-on-parent-hover:not(:focus-within) {
        opacity: 0;
    }

    .list-item {
        transition: transform 0.2s cubic-bezier(0.05, 0.7, 0.03, 3) 0s;
    }

    .list-item:not(:first-child):not(.selected):not(.after-selected) {
        border-top: solid 1px var(--border-color);
    }

    .list-item.hover:hover,
    .list-item.hover:hover + .list-item,
    .list-item:focus-visible,
    .list-item:focus-visible + .list-item,
    .list-item[aria-selected] {
        border-color: transparent !important;
        border-radius: 0.5em;
    }

    .list-item[aria-selected] {
        background: var(--selected-background, var(--color-blue));
        color: var(--selected-foreground, var(--color-white));
        transform: scale(1.02);
    }
`;
