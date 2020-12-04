import { css } from "lit-element";
import * as mixins from "./mixins";

export const base = css`
    :host {
        font-family: inherit;
    }

    button,
    a.button {
        padding: 0.5em 0.7em;
        cursor: pointer;
        text-align: center;
        text-shadow: inherit;
        background: var(--color-shade-2);
    }

    [hidden] {
        display: none !important;
    }

    [invisible] {
        opacity: 0;
    }

    [disabled] {
        opacity: 0.5;
        pointer-events: none !important;
    }

    header {
        display: flex;
        padding: 10px;
        background: var(--color-tertiary);
        border-bottom: solid 3px var(--color-shade-1);
        align-items: center;
        font-weight: bold;
        min-height: 40px;
    }

    main {
        flex: 1;
        box-sizing: border-box;
        ${mixins.scroll()}
        overflow-x: hidden;
        position: relative;
    }

    code {
        font-family: var(--font-family-mono);
    }

    .centered-text {
        text-align: center;
    }

    .tiny {
        font-size: var(--font-size-tiny);
    }

    .small {
        font-size: var(--font-size-small);
    }

    .large {
        font-size: var(--font-size-large);
    }

    .huge {
        font-size: var(--font-size-huge);
    }

    .card {
        border-radius: 0.5em;
        background: var(--color-background);
        border: solid 1px var(--color-shade-1);
        border-bottom-width: 3px;
        margin: 0.5em;
    }

    .padded {
        padding: 0.5em;
    }

    .margined {
        margin: 0.5em;
    }

    .blue {
        --color-foreground: var(--color-blue);
    }

    .red {
        --color-background: var(--color-white);
        --color-foreground: var(--color-red);
        color: var(--color-foreground);
        background: var(--color-background);
    }

    .inverted {
        background: var(--color-foreground);
        color: var(--color-background);
    }

    .bold {
        font-weight: bold;
    }
`;
