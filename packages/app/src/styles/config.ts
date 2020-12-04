import "../../assets/fonts/fonts.css";
import { css } from "lit-element";

export const narrowWidth = 700;
export const wideWidth = 1200;

export const cssVars = css`
    :host {
        --font-family: "Nunito";
        --font-family-fallback: sans-serif;
        --font-family-mono: "Inconsolata";

        --font-size-base: medium;
        --font-size-small: 0.85em;
        --font-size-tiny: 0.7em;
        --font-size-large: 1.2em;
        --font-size-huge: 1.5em;

        --color-blue: #3bb7f9;
        --color-blue-light: rgb(7, 124, 185);
        --color-blue-dark: rgb(89, 198, 255);

        --color-black: #444;

        --color-white: #ffffff;
        --color-white-dark: #fafafa;

        --color-red: #ff6666;

        --color-negative: var(--color-red);

        --color-background: var(--color-white);
        --color-foreground: var(--color-black);
        --color-highlight: var(--color-blue);
        --color-error: var(--color-negative);

        --color-shade-1: rgba(0, 0, 0, 0.05);
        --color-shade-2: rgba(0, 0, 0, 0.1);
        --color-shade-3: rgba(0, 0, 0, 0.15);
        --color-shade-4: rgba(0, 0, 0, 0.2);

        --color-scrim: rgba(255, 255, 255, 0.9);

        --border-color: var(--color-shade-2);

        font-family: var(--font-family), var(--font-family-fallback) !important;
        font-size: var(--font-size-base);
    }
`;
