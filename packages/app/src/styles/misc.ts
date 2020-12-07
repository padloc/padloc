import { css } from "lit-element";
import * as mixins from "./mixins";

export const misc = css`
    .tap {
        position: relative;
        cursor: pointer;
    }

    .tap::after {
        content: "";
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: currentColor;
        opacity: 0;
        transition: opacity 1s;
        pointer-events: none;
        border-radius: inherit;
    }

    .tap:active::after {
        opacity: 0.3;
        transition: none;
    }

    .tap::before {
        content: "";
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: currentColor;
        opacity: 0;
        pointer-events: none;
        border-radius: inherit;
    }

    .tap:not(:active):hover::before {
        opacity: 0.1;
    }

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
    }

    .tag.warning {
        background: var(--color-negative);
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
`;
