import { css } from "lit";

export const base = css`
    :host {
        font-family: inherit;
    }

    [hidden] {
        display: none !important;
    }

    [invisible] {
        opacity: 0;
        pointer-events: none !important;
    }

    [disabled] {
        opacity: 0.5;
        pointer-events: none !important;
    }

    :focus-visible {
        box-shadow: inset var(--focus-outline-color, var(--color-primary)) 0 0 0 2px;
        z-index: 1;
    }

    code {
        font-family: var(--font-family-mono);
    }

    strong {
        font-weight: bold;
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

    .card.negative {
        color: var(--color-negative);
    }

    .highlight,
    .highlighted {
        color: var(--color-highlight);
    }

    .thin {
        font-weight: var(--font-weight-thin);
    }

    .extralight {
        font-weight: var(--font-weight-extralight);
    }

    .light {
        font-weight: var(--font-weight-light);
    }

    .semibold {
        font-weight: var(--font-weight-semibold);
    }

    .bold {
        font-weight: var(--font-weight-bold);
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

    pl-menu,
    header {
        -webkit-app-region: drag;
    }

    ::-webkit-scrollbar {
        width: var(--scrollbar-width, 0.8em);
    }

    ::-webkit-scrollbar-track {
        background-color: var(--color-shade-1);
        border-radius: var(--scrollbar-width, 0.8em);
        border: solid var(--scrollbar-margin, 0.2em) transparent;
        background-clip: padding-box;
    }

    ::-webkit-scrollbar-thumb {
        background-color: var(--color-shade-2);
        border-radius: var(--scrollbar-width, 0.8em);
        border: solid var(--scrollbar-margin, 0.2em) transparent;
        background-clip: padding-box;
        transition: all 0.5s;
    }

    ::-webkit-scrollbar-thumb:hover {
        border-width: 1px;
        background-color: var(--color-shade-4);
    }
`;
