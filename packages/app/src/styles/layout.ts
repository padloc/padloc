import { css } from "lit-element";
import { fullbleed } from "./mixins";

export const layout = css`
    .fullbleed {
        ${fullbleed()}
    }

    /** FLEX LAYOUT */

    .layout {
        display: flex;
    }

    .layout.vertical {
        flex-direction: column;
    }

    .layout.horizontal {
        display: flex;
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

    .layout > .stretch,
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

    .relative {
        position: relative;
    }

    .padded {
        padding: var(--spacing);
    }

    .margined {
        margin: var(--spacing);
    }

    .double-margined {
        margin: calc(2 * var(--spacing));
    }

    .spacer {
        min-height: var(--spacing);
        min-width: var(--spacing);
    }
`;
