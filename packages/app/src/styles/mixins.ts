export const unselectable = () => `
    cursor: default;
    user-select: none;
`;

export const positionSticky = () => `
    position: -webkit-sticky;
    position: -moz-sticky;
    position: -o-sticky;
    position: -ms-sticky;
    position: sticky;
`;

export const tapHighlight = () => `
    position: relative;
    cursor: pointer;
`;

export const tapHighlightAfter = () => `
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
    border-radius: inherit;
`;

export const tapHighlightActiveAfter = () => `
    opacity: 0.3;
    transition: none;
`;

export const tapHighlightHoverAfter = () => `
    opacity: 0.1;
    transition: none;
`;

export const fullbleed = () => `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
`;

export const scroll = (direction?: "vertical" | "horizontal") => `
    ${direction === "vertical" ? "overflow-y" : direction === "horizontal" ? "overflow-x" : "overflow"}: auto;
    -webkit-overflow-scrolling: touch;
`;

export const ellipsis = () => `
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const absoluteCenter = () => `
    ${fullbleed()};
    margin: auto;
`;

export const shade1 = () => `
    background: var(--shade-1-color);
`;

export const shade2 = () => `
    background: var(--shade-2-color);
`;

export const shade3 = () => `
    background: var(--shade-3-color);
`;

export const shade4 = () => `
    background: var(--shade-4-color);
`;

export const shade5 = () => `
    background: var(--shade-5-color);
`;

export const card = () => `
    background: var(--color-background);
    /* box-shadow: rgba(0, 0, 0, 0.2) 0 0 1px; */
    border-radius: var(--border-radius);
    border: solid 1px rgba(0, 0, 0, 0.1);
    border-bottom-width: 2px;
    overflow: hidden;
`;

export const gradientHighlight = (horizontal = false) => `
    background: linear-gradient(${
        horizontal ? "90deg" : "0"
    }, var(--color-gradient-highlight-from) 0%, var(--color-gradient-highlight-to) 100%);
`;

export const gradientWarning = (horizontal = false) => `
    background: linear-gradient(${
        horizontal ? "90deg" : "0"
    }, var(--color-gradient-warning-from) 0%, var(--color-gradient-warning-to) 100%);
`;

export const gradientDark = (horizontal = false) => `
    background: linear-gradient(${
        horizontal ? "90deg" : "0"
    }, var(--color-gradient-dark-from) 0%, var(--color-gradient-dark-to) 100%);
`;

export const textShadow = () => `
    text-shadow: rgba(0, 0, 0, 0.2) 0px 2px 0px;
`;
