import { css } from "lit";
import { fullbleed } from "./mixins";

export const layout = css`
    .fullbleed {
        ${fullbleed()};
    }

    /** FLEX LAYOUT */

    .layout {
        display: flex;
    }

    .layout.inline {
        display: inline-flex;
    }

    .layout.vertical {
        flex-direction: column;
    }

    .layout.horizontal {
        flex-direction: row;
    }

    .layout.center-aligning {
        align-items: center;
    }

    .layout.start-aligning {
        align-items: start;
    }

    .layout.end-aligning {
        align-items: end;
    }

    .layout.center-justifying {
        justify-content: center;
    }

    .layout.start-justifying {
        justify-content: start;
    }

    .layout.end-justifying {
        justify-content: end;
    }

    .layout.centering {
        align-items: center;
        justify-content: center;
    }

    .stretch,
    .layout.stretching > * {
        flex-grow: 1;
    }

    .layout:not(.stretching) > :not(.stretch) {
        flex: none;
    }

    .layout.horizontal.stretching.evenly > *,
    .layout.horizontal > .collapse {
        width: 0;
    }

    .layout.vertical.stretching.evenly > *,
    .layout.vertical > .collapse {
        height: 0;
    }

    .layout.horizontal.spacing > :not(:last-child) {
        margin-right: var(--spacing);
    }

    .layout.vertical.spacing > :not(:last-child) {
        margin-bottom: var(--spacing);
    }

    .layout.horizontal.double-spacing > :not(:last-child) {
        margin-right: calc(2 * var(--spacing));
    }

    .layout.vertical.double-spacing > :not(:last-child) {
        margin-bottom: calc(2 * var(--spacing));
    }

    .layout.horizontal.half-spacing > :not(:last-child) {
        margin-right: calc(0.5 * var(--spacing));
    }

    .layout.vertical.half-spacing > :not(:last-child) {
        margin-bottom: calc(0.5 * var(--spacing));
    }

    .layout.wrapping {
        flex-wrap: wrap;
    }

    .relative {
        position: relative;
    }

    .block {
        display: block;
    }

    .padded {
        padding: var(--spacing);
    }

    .vertically-padded {
        padding-top: var(--spacing);
        padding-bottom: var(--spacing);
    }

    .horizontally-padded {
        padding-left: var(--spacing);
        padding-right: var(--spacing);
    }

    .left-padded {
        padding-left: var(--spacing);
    }

    .right-padded {
        padding-right: var(--spacing);
    }

    .top-padded {
        padding-top: var(--spacing);
    }

    .bottom-padded {
        padding-bottom: var(--spacing);
    }

    .horizontally-double-padded {
        padding-left: calc(2 * var(--spacing));
        padding-right: calc(2 * var(--spacing));
    }

    .horizontally-half-padded {
        padding-left: calc(0.5 * var(--spacing));
        padding-right: calc(0.5 * var(--spacing));
    }

    .double-padded {
        padding: calc(2 * var(--spacing));
    }

    .half-padded {
        padding: calc(0.5 * var(--spacing));
    }

    .margined {
        margin: var(--spacing);
    }

    .vertically-margined {
        margin-top: var(--spacing);
        margin-bottom: var(--spacing);
    }

    .horizontally-margined {
        margin-left: var(--spacing);
        margin-right: var(--spacing);
    }

    .horizontally-half-margined {
        margin-left: calc(0.5 * var(--spacing));
        margin-right: calc(0.5 * var(--spacing));
    }

    .horizontally-double-margined {
        margin-left: calc(2 * var(--spacing));
        margin-right: calc(2 * var(--spacing));
    }

    .vertically-half-margined {
        margin-top: calc(0.5 * var(--spacing));
        margin-bottom: calc(0.5 * var(--spacing));
    }

    .vertically-double-margined {
        margin-top: calc(2 * var(--spacing));
        margin-bottom: calc(2 * var(--spacing));
    }

    .bottom-margined {
        margin-bottom: var(--spacing);
    }

    .bottom-half-margined {
        margin-bottom: calc(0.5 * var(--spacing));
    }

    .top-margined {
        margin-top: var(--spacing);
    }

    .top-half-margined {
        margin-top: calc(0.5 * var(--spacing));
    }

    .left-margined {
        margin-left: var(--spacing);
    }

    .left-half-margined {
        margin-left: calc(0.5 * var(--spacing));
    }

    .right-margined {
        margin-right: var(--spacing);
    }

    .right-half-margined {
        margin-right: calc(0.5 * var(--spacing));
    }

    .double-margined {
        margin: calc(2 * var(--spacing));
    }

    .half-margined {
        margin: calc(0.5 * var(--spacing));
    }

    .negatively-margined {
        margin: calc(-1 * var(--spacing));
    }

    .spacer {
        min-height: var(--spacing);
        min-width: var(--spacing);
    }

    .fit {
        max-width: 100%;
        max-height: 100%;
        box-sizing: border-box;
    }

    .fit-vertically {
        max-height: 100%;
        box-sizing: border-box;
    }

    .fit-horizontally {
        max-width: 100%;
        box-sizing: border-box;
    }

    .fill {
        min-width: 100%;
        min-height: 100%;
        box-sizing: border-box;
    }

    .fill-vertically {
        min-height: 100%;
        box-sizing: border-box;
    }

    .fill-horizontally {
        width: 100%;
        box-sizing: border-box;
    }

    .scrolling {
        overflow: auto;
    }

    .scrolling-vertically {
        overflow: hidden auto;
    }

    .scrolling-horizontally {
        overflow: auto hidden;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(var(--grid-column-width, 10em), 1fr));
        grid-gap: var(--spacing);
    }

    .layout.pane {
        flex-direction: row;
    }

    .layout.pane > :first-child {
        width: 100%;
        max-width: var(--pane-left-width, 25em);
        border-right: solid 1px var(--border-color);
        flex: 1;
    }

    .layout.pane > :last-child {
        flex: 1;
    }

    .min-width-10em {
        min-width: 10em;
    }

    .min-width-20em {
        min-width: 20em;
    }

    .min-width-30em {
        min-width: 30em;
    }

    .min-width-40em {
        min-width: 40em;
    }

    .max-width-10em {
        max-width: 10em;
    }

    .max-width-20em {
        max-width: 20em;
    }

    .max-width-30em {
        max-width: 30em;
    }

    .max-width-40em {
        max-width: 40em;
    }

    .top-right-corner {
        position: absolute;
        top: var(--spacing);
        right: var(--spacing);
        z-index: 1;
    }

    @media (min-width: 701px) {
        .back-button,
        .narrow-only {
            display: none;
        }
    }

    @media (min-width: 1001px) {
        .menu-button {
            pointer-events: none !important;
        }
    }

    @media (max-width: 700px) {
        /* header {
            box-shadow: rgb(0 0 0 / 30%) 0px 1px 6px -3px !important;
        } */

        .layout.pane > :first-child {
            ${fullbleed()};
            max-width: unset;
            border: none;
            will-change: transform;
            transition: transform 0.3s;
        }

        .layout.pane > :last-child {
            ${fullbleed()};
            z-index: 1;
            will-change: transform;
            transition: transform 0.3s;
            box-shadow: rgba(0, 0, 0, 0.3) -1px 0 6px -3px;
        }

        .layout.pane.open > :first-child {
            transform: translateX(-50%);
        }

        .layout.pane:not(.open) > :last-child {
            transform: translateX(calc(100% + 6px));
        }
    }
`;
