import { css } from "lit-element";

export const base = css`
    :host {
        font-family: inherit;
    }

    [hidden] {
        display: none !important;
    }

    [invisible] {
        opacity: 0;
        pointer-events: none;
    }

    [disabled] {
        opacity: 0.5;
        pointer-events: none !important;
    }

    :focus-visible {
        box-shadow: var(--color-highlight, var(--color-blue)) 0 0 0 2px;
    }

    code {
        font-family: var(--font-family-mono);
    }

    strong {
        font-weight: bold;
    }

    h1 {
        font-size: var(--font-size-huge);
    }

    h2 {
        font-size: var(--font-size-big);
    }

    h3 {
        font-size: var(--font-size-large);
    }

    ul.bullets {
        list-style: disc;
        padding-left: 2em;
    }

    .text-centering {
        text-align: center;
    }

    .text-left-aligning {
        text-align: left;
    }

    .text-right-aligning {
        text-align: right;
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

    .big {
        font-size: var(--font-size-big);
    }

    .huge {
        font-size: var(--font-size-huge);
    }

    .giant {
        font-size: var(--font-size-giant);
    }

    .card {
        border-radius: 0.5em;
        background: var(--color-background);
        border: solid 1px var(--color-shade-1);
        border-bottom-width: 3px;
    }

    .blue {
        --color-foreground: var(--color-blue);
        color: var(--color-foreground);
    }

    .red {
        --color-background: var(--color-white);
        --color-foreground: var(--color-red);
        color: var(--color-foreground);
        background: var(--color-background);
    }

    .highlight {
        color: var(--color-highlight);
    }

    .inverted {
        background: var(--color-foreground);
        color: var(--color-background);
    }

    .bold {
        font-weight: bold;
    }

    .semibold {
        font-weight: 600;
    }

    .mono {
        font-family: var(--font-family-mono);
    }

    .subtle {
        opacity: 0.7;
    }

    .faded {
        opacity: 0.5;
    }

    .rounded {
        border-radius: 0.5em;
    }

    .round {
        border-radius: 100%;
    }

    .background {
        background: var(--color-background);
    }
`;
