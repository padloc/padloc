import { css } from "lit-element";

export const narrowWidth = 700;
export const wideWidth = 1200;

export const cssVars = css`
    :host {
        --font-family: "Nunito";
        --font-family-fallback: sans-serif;
        --font-family-mono: "Inconsolata";

        --font-size-micro: 12px;
        --font-size-tiny: 14px;
        --font-size-small: 16px;
        --font-size-default: 18px;
        --font-weight-thin: 100;
        --font-weight-light: 300;
        --font-weight-regular: 400;
        --font-weight-bold: 700;

        --color-primary: #3bb7f9;
        --color-secondary: #444;
        --color-tertiary: #ffffff;
        --color-quaternary: #fafafa;
        /* --color-negative: #D7322D; */
        --color-negative: #ff6666;

        --color-background: var(--color-tertiary);
        --color-foreground: var(--color-secondary);
        --color-highlight: var(--color-primary);
        --color-error: var(--color-negative);

        --color-shade-1: rgba(0, 0, 0, 0.05);
        --color-shade-2: rgba(0, 0, 0, 0.1);
        --color-shade-3: rgba(0, 0, 0, 0.15);
        --color-shade-4: rgba(0, 0, 0, 0.2);

        --color-gradient-highlight-from: rgb(7, 124, 185);
        --color-gradient-highlight-to: rgb(89, 198, 255);
        --color-gradient-warning-from: #f25b00;
        --color-gradient-warning-to: #f49300;
        --color-gradient-dark-from: #222;
        --color-gradient-dark-to: #555;

        --color-scrim: rgba(255, 255, 255, 0.9);

        --color-btn-front: var(--color-foreground);
        --color-btn-back: var(--shade-3-color);

        --row-height: 50px;

        --gutter-size: 8px;
        --border-radius: 8px;
        --border-color: rgba(0, 0, 0, 0.1);

        --toaster-easing: cubic-bezier(1, -0.3, 0, 1.3);

        --shade-1-color: transparent;
        --shade-2-color: var(--color-shade-1);
        --shade-3-color: var(--color-shade-2);
        --shade-4-color: var(--color-shade-3);
        --shade-5-color: var(--color-shade-4);

        --narrow-width: 700px;
        --wide-width: 1200px;
    }
`;
