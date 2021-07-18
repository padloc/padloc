import { css } from "lit";
import * as mixins from "./mixins";

export const misc = css`
    ${mixins.click(".click")}
    ${mixins.hover(".hover")}

    .ellipsis {
        ${mixins.ellipsis()};
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
        padding: 0.1em 0.3em;
        text-align: center;
        line-height: 1.4em;
        text-shadow: none;
        border: solid 1px;
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
    }

    .tag.highlight {
        color: var(--color-highlight);
    }

    .tag.warning {
        color: var(--color-negative);
    }

    .empty-placeholder {
        ${mixins.fullbleed()};
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
        ${mixins.scroll("horizontal")};
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
        border-radius: 0.5em;
        position: relative;
    }

    .list-item:not(.hover)::before,
    .list-item.hover:not(:hover)::before {
        content: "";
        display: block;
        content: "";
        position: absolute;
        top: 0;
        left: 0.5em;
        right: 0.5em;
        width: auto;
        height: 2px;
        border-radius: 100%;
        overflow: hidden;
        margin: 0 auto;
        background: var(--color-shade-1);
    }

    .list-item.hover:hover + .list-item::before,
    .list-item:not([aria-posinset]):first-child::before,
    .list-item[aria-posinset="0"]::before {
        background: none;
    }

    .list-item[aria-selected="true"] {
        background: var(--selected-background, var(--color-blue));
        color: var(--selected-foreground, var(--color-white));
        transform: scale(1.02);
    }

    .divider {
        display: flex;
        align-items: center;
        font-variant: small-caps;
        letter-spacing: 0.1em;
    }

    .divider.left::before {
        display: none;
    }

    .divider::before,
    .divider::after {
        content: "";
        display: block;
        margin: 1em;
        flex: 1;
        height: 2px;
        border-radius: 100%;
        background: currentColor;
        opacity: 0.05;
    }
`;
