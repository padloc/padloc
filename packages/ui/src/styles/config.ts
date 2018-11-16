import { html } from "@polymer/lit-element";

export const narrowWidth = 900;
export const wideWidth = 1200;

export const cssVars = html`
    <style>
        :host {
            --font-family: "Clear Sans";
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

            --color-background: var(--color-tertiary);
            --color-foreground: var(--color-secondary);
            --color-highlight: var(--color-primary);
            --color-error: #D7322D;

            --color-gradient-highlight-from: rgb(7, 124, 185);
            --color-gradient-highlight-to: rgb(89, 198, 255);
            --color-gradient-warning-from: #f49300;
            --color-gradient-warning-to: #f25b00;
            --color-gradient-dark-from: #222;
            --color-gradient-dark-to: #555;

            --color-scrim: rgba(255, 255, 255, 0.9);

            --row-height: 50px;

            --gutter-width: 4px;
            --border-radius: 8px;
            --border-color: rgba(0, 0, 0, 0.1);

            --toaster-easing: cubic-bezier(1, -0.3, 0, 1.3);

            --shade-1-color: transparent;
            --shade-2-color: rgba(0, 0, 0, 0.05);
            --shade-3-color: rgba(0, 0, 0, 0.1);
            --shade-4-color: rgba(0, 0, 0, 0.15);
            --shade-5-color: rgba(0, 0, 0, 0.2);
        }
    </style>
`;
