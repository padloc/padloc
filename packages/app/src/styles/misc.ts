import { css } from "lit";
import * as mixins from "./mixins";

export const misc = css`
    ${mixins.click(".click")}
    ${mixins.hover(".hover")}

    .ellipsis {
        ${mixins.ellipsis()};
    }

    .nowrap {
        white-space: nowrap;
    }

    .underlined {
        text-decoration: underline;
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

    .tags .tag:not(:last-child) {
        margin-right: 0.5em;
    }

    .tag.ghost {
        border: dashed 1px;
        background: transparent;
    }

    .tag.warning {
        color: var(--color-negative);
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
        overflow: hidden;
    }

    .box.highlighted {
        --box-border-color: var(--color-highlight);
        --border-color: var(--color-highlight);
    }

    .box.negative.highlighted {
        --box-border-color: var(--color-negative);
        --border-color: var(--color-negative);
    }

    .background,
    .bg {
        background: var(--color-background);
    }

    .background-dark,
    .bg-dark {
        background: var(--color-background-dark);
    }

    .uppercase {
        font-variant: all-small-caps;
        letter-spacing: 0.1em;
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
        transition: box-shadow 0.2s;
    }

    .list-item:not(:first-child) {
        border-top-style: solid;
        border-top-width: 1px;
        border-top-color: var(--list-item-border-color, var(--border-color));
    }

    .list-item.box:not(:first-child) {
        margin-top: var(--spacing);
    }

    .list-item[aria-selected="true"] {
        background: var(--list-item-selected-background);
        color: var(--list-item-selected-color);
        --color-highlight: var(--list-item-selected-color-highlight);
        box-shadow: inset 0.2em 0 0 0 var(--color-highlight);
    }

    .list-item:focus:not([aria-selected="true"]) {
        color: var(--list-item-focus-color);
        box-shadow: inset 0.2em 0 0 0 var(--color-highlight);
    }

    .section-header {
        font-variant: all-small-caps;
        letter-spacing: 0.1em;
        font-weight: 600;
    }

    .menu-item {
        padding: var(--spacing);
        display: flex;
        align-items: center;
        border-radius: 0.5em;
        color: var(--menu-item-color);
        background: var(--menu-item-background);
        font-weight: var(--menu-item-weight);
    }

    .menu-item .stretch {
        width: 0;
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

    .hide-scrollbar {
        scrollbar-width: none;
    }

    .hide-scrollbar::-webkit-scrollbar {
        display: none;
    }

    .header-title {
        font-size: var(--header-title-size);
        font-weight: var(--header-title-weight);
    }

    .scrim {
        background: var(--color-background);
        opacity: 0.8;
    }
`;
