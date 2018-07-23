import { html } from "@polymer/lit-element";

export default html`
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
            --color-error: red;

            --row-height: 50px;

            --gutter-width: 4px;
            --border-radius: 8px;

            --toaster-easing: cubic-bezier(1, -0.3, 0, 1.3);

            --unselectable: {
                cursor: default;
                user-select: none;
            };

            --position-sticky: {
                position: -webkit-sticky;
                position: -moz-sticky;
                position: -o-sticky;
                position: -ms-sticky;
                position: sticky;
            };

            --tap-highlight: {
                position: relative;
                cursor: pointer;
            };

            --tap-highlight-after: {
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
            };

            --tap-highlight-active-after: {
                opacity: 0.3;
                transition: none;
            };

            --fullbleed: {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                overflow: hidden;
            };

            --scroll: {
                overflow: auto;
                 -webkit-overflow-scrolling: touch;
             };

            --ellipsis: {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            };

            --absolute-center: {
                @apply --fullbleed;
                margin: auto;
            };

            --shade-1-color: transparent;
            --shade-2-color: rgba(0, 0, 0, 0.05);
            --shade-3-color: rgba(0, 0, 0, 0.1);
            --shade-4-color: rgba(0, 0, 0, 0.15);
            --shade-5-color: rgba(0, 0, 0, 0.2);

            --shade-1: {
                background: var(--shade-1-color);
            };

            --shade-2: {
                background: var(--shade-2-color);
            };

            --shade-3: {
                background: var(--shade-3-color);
            };

            --shade-4: {
                background: var(--shade-4-color);
            };

            --shade-5: {
                background: var(--shade-5-color);
            };

            --card: {
                background: var(--color-background);
                /* box-shadow: rgba(0, 0, 0, 0.2) 0 0 1px; */
                border-radius: var(--border-radius);
                border: solid 1px rgba(0, 0, 0, 0.1);
                border-bottom-width: 2px;
                overflow: hidden;
            }
        }
</style>`;
