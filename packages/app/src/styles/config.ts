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
        --font-size-big: 1.25em;
        --font-size-huge: 1.5em;
        --font-size-giant: 2em;

        --color-blue: rgb(59, 183, 249);
        --color-blue-light: rgb(89, 198, 255);
        --color-blue-dark: rgb(7, 124, 185);

        --blue-gradient: linear-gradient(var(--color-blue-light), var(--color-blue-dark));

        /*
        --color-blue-light: rgba(61, 249, 220, 1);
        --color-blue-dark: rgba(59, 88, 249, 1);
        --blue-gradient: linear-gradient(to bottom right, var(--color-blue-dark), var(--color-blue-light));
        */

        --color-black: #444;
        --color-black-dark: #333;
        --color-black-light: #555;

        --black-gradient: linear-gradient(var(--color-black-light), var(--color-black-dark));

        --color-white: #ffffff;
        --color-white-dark: #fafafa;

        --color-red: #ff6666;

        --color-negative: var(--color-red);

        --color-background: var(--color-white);
        --color-foreground: var(--color-black);
        --color-highlight: var(--color-blue);
        --color-highlight-inverse: var(--color-white);
        --color-error: var(--color-negative);

        --color-shade-1: rgba(0, 0, 0, 0.05);
        --color-shade-2: rgba(0, 0, 0, 0.1);
        --color-shade-3: rgba(0, 0, 0, 0.15);
        --color-shade-4: rgba(0, 0, 0, 0.2);
        --color-shade-5: rgba(0, 0, 0, 0.25);
        --color-shade-6: rgba(0, 0, 0, 0.3);

        --color-scrim: rgba(255, 255, 255, 0.9);

        --border-color: var(--color-shade-2);
        --border-radius: 0.5em;

        --spacing: 0.5em;

        --text-shadow: rgba(0, 0, 0, 0.15) 0 0.12em 0;

        font-family: var(--font-family), var(--font-family-fallback) !important;
        font-size: var(--font-size-base);
    }

    :host(.theme-light) {
        --color-background: var(--color-white);
        --color-foreground: var(--color-black);
        --color-shade-1: rgba(0, 0, 0, 0.05);
        --color-shade-2: rgba(0, 0, 0, 0.1);
        --color-shade-3: rgba(0, 0, 0, 0.15);
        --color-shade-4: rgba(0, 0, 0, 0.2);
        --color-shade-5: rgba(0, 0, 0, 0.25);
        --color-shade-6: rgba(0, 0, 0, 0.3);
    }

    :host(.theme-dark) {
        --color-background: var(--color-black-dark);
        --color-foreground: var(--color-white);
        --color-shade-1: rgba(255, 255, 255, 0.05);
        --color-shade-2: rgba(255, 255, 255, 0.1);
        --color-shade-3: rgba(255, 255, 255, 0.15);
        --color-shade-4: rgba(255, 255, 255, 0.2);
        --color-shade-5: rgba(255, 255, 255, 0.25);
        --color-shade-6: rgba(255, 255, 255, 0.3);
    }

    @media (prefers-color-scheme: dark) {
        :host {
            --color-background: var(--color-black-dark);
            --color-foreground: var(--color-white);
            --color-shade-1: rgba(255, 255, 255, 0.05);
            --color-shade-2: rgba(255, 255, 255, 0.1);
            --color-shade-3: rgba(255, 255, 255, 0.15);
            --color-shade-4: rgba(255, 255, 255, 0.2);
            --color-shade-5: rgba(255, 255, 255, 0.25);
            --color-shade-6: rgba(255, 255, 255, 0.3);
        }
    }
`;
