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

    .tags.wrapping {
        flex-wrap: wrap;
        overflow: visible;
        gap: 0.5em 0;
    }

    .tags::after {
        content: "";
        display: block;
        width: 1px;
        flex: none;
    }

    .tag {
        border-radius: 0.5em;
        padding: var(--tag-padding, 0.5em);
        text-align: center;
        line-height: 1em;
        border: solid 1px;
        font-family: var(--tag-font-family, var(--font-family));
    }

    .tag:not(:last-child) {
        margin-right: 0.5em;
    }

    .tag.ghost {
        border: dashed 1px;
        background: transparent;
    }

    .tag.highlight {
        color: var(--tag-highlight-color, var(--color-highlight));
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

    .box {
        border-radius: 0.5em;
        border-color: var(--box-border-color, var(--border-color));
        border-style: var(--box-border-style, solid);
        border-width: var(--box-border-width, 1px);
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

    .list-item.box:not(:first-child) {
        margin-top: var(--spacing);
    }

    .list-item:not(.box):not(.hover)::before,
    .list-item:not(.box).hover:not(:hover)::before {
        content: "";
        display: block;
        content: "";
        position: absolute;
        top: 0;
        left: 0.5em;
        right: 0.5em;
        width: auto;
        height: 0;
        overflow: hidden;
        margin: 0 auto;
        border-bottom-style: solid;
        border-bottom-width: 1px;
        border-bottom-color: var(--list-item-border-color, var(--border-color));
    }

    .list-item:not(.box).hover:hover + .list-item::before,
    .list-item:not(.box):not([aria-posinset]):first-child::before,
    .list-item:not(.box)[aria-posinset="0"]::before {
        border-color: transparent !important;
    }

    .list-item[aria-selected="true"] {
        background: var(--list-item-selected-background);
        color: var(--list-item-selected-color);
        transform: scale(1.02);
    }

    .section-header {
        font-variant: small-caps;
        letter-spacing: 0.1em;
    }

    .menu-item {
        padding: var(--spacing);
        display: flex;
        align-items: center;
        margin: 0 var(--spacing);
        border-radius: 0.5em;
        color: var(--menu-item-color);
        background: var(--menu-item-background);
        font-weight: var(--menu-item-weight);
    }

    .menu-item .stretch {
        width: 0;
    }

    .menu-item:not(:last-child) {
        margin-bottom: calc(0.5 * var(--spacing));
    }

    .menu-item > :not(:last-child) {
        margin-right: var(--spacing);
    }

    ${mixins.click(".menu-item")}
    ${mixins.hover(".menu-item")}

            .menu-item[aria-selected="true"] {
        background: var(--menu-item-selected-background);
        color: var(--menu-item-selected-color);
        font-weight: var(--menu-item-selected-weight);
    }

    .menu-item .dropdown-icon {
        transition: transform 0.3s;
    }

    .menu-item[aria-expanded="false"] .dropdown-icon {
        transform: rotate(-90deg);
    }
`;
