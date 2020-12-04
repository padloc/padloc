import { css } from "lit-element";
import * as mixins from "./mixins";

export const misc = css`
    .item {
        border-radius: var(--border-radius);
        background: var(--color-tertiary);
        border: solid 1px var(--color-shade-1);
        border-bottom-width: 3px;
        margin: var(--gutter-size);
        /*box-shadow: 0px 5px 5px -5px var(--color-shade-2), 0 0 2px var(--color-shade-1);*/
    }

    .item.error {
        background: var(--color-negative);
        color: var(--color-white);
        padding: 0.5em;
        text-align: center;
    }

    .item.padded {
        padding: 0.5em;
    }

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
        margin: 8px 0;
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
        color: var(--color-tertiary);
        /*text-shadow: rgba(0, 0, 0, 0.2) 0 1px 0;*/
        font-weight: bold;
        border-radius: var(--border-radius);
        font-size: var(--font-size-tiny);
        padding: 5px 8px;
        line-height: normal;
        text-align: center;
        background: var(--color-secondary);
    }

    .tag:not(:last-child) {
        margin-right: 6px;
    }

    .tag > * {
        display: inline-block;
        vertical-align: top;
    }

    .tag pl-icon {
        width: 20px;
        height: 20px;
    }

    .tag pl-icon:first-child {
        margin-left: -2px;
    }

    .tag pl-icon:last-child {
        margin-right: -2px;
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

    .tags.tiny .tag {
        font-size: 12px;
        padding: 4px 6px;
        line-height: 14px;
        border-radius: 6px;
    }

    .tags.tiny pl-icon {
        font-size: 10px;
        width: 14px;
        height: 14px;
    }

    .tags.small .tag {
        font-size: var(--font-size-micro);
        padding: 4px 6px;
        line-height: 16px;
    }

    .tags.small pl-icon {
        font-size: 10px;
        width: 16px;
        height: 16px;
    }

    .fabs {
        position: absolute;
        z-index: 2;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        display: flex;
        align-items: center;
    }

    .fab {
        pointer-events: auto;
        border-radius: 45px;
        margin: 12px;
        box-shadow: rgba(0, 0, 0, 0.3) 0 1px 3px;
        color: var(--color-tertiary);
        width: 45px;
        height: 45px;
        text-shadow: rgba(0, 0, 0, 0.2) 0 2px 0px;
        background: var(--color-secondary);
    }

    button.fab {
        width: auto;
        padding: 4px 20px;
        font-weight: bold;
    }

    .fab.primary {
        background: var(--color-primary);
    }

    .fab.light {
        background: var(--color-tertiary);
        color: var(--color-secondary);
        text-shadow: none;
    }

    .fab:not(:last-child) {
        margin-right: 0;
    }

    .fab.destructive {
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
