import "./config";

const styles = `
    :host {
        user-select: none;
        -webkit-user-select: none;
    }

    input, textarea {
        user-select: auto;
        -webkit-user-select: auto;
    }

    :host, html, button, input, textarea {
        font-family: var(--font-family), var(--font-family-fallback);
        font-weight: var(--font-weight-regular);
        font-size: var(--font-size-default);
        text-shadow: inherit;
        -webkit-font-smoothing: antialiased;
        -webkit-tap-highlight-color: transparent;
    }

    ::selection {
        background: var(--color-secondary);
        color: var(--color-tertiary);
    }

    a {
        text-decoration: none;
        color: inherit;
    }

    button, a.button {
        display: inline-block;
        color: inherit;
        font-family: inherit;
        font-size: inherit;
        font-weight: inherit;
        border: none;
        margin: 0;
        height: var(--row-height);
        line-height: var(--row-height);
        padding: 0 15px;
        cursor: pointer;
        text-align: center;
        background: transparent;
    }

    button.arrow, a.button.arrow {
        padding-right: 30px;
    }

    button.arrow::before, a.button.arrow::before {
        font-family: "FontAwesome";
        content: "\\f054";
        display: block;
        position: absolute;
        top: 0;
        right: 15px;
        bottom: 0;
    }

    input, select {
        border: none;
        appearance: none;
        font-family: inherit;
        font-size: inherit;
        font-weight: inherit;
        color: inherit;
        border-radius: 0;
        background: transparent;
        margin: 0;
        padding: 0;
    }

    textarea {
        font-weight: inherit;
        font-family: inherit;
        font-size: inherit;
        color: inherit;
        border: none;
        background: transparent;
        margin: 0;
        display: block;
        padding: 0;
        border-radius: 0;
        appearance: none;
        resize: none;
    }

    textarea[nowrap] {
        white-space: pre;
        word-wrap: normal;
        overflow-x: scroll;
    }

    strong {
        font-weight: var(--font-weight-bold);
    }

    ::-webkit-search-cancel-button {
        display: none;
    }

    *:focus {
        outline: none;
    }

    ::-webkit-input-placeholder {
        text-shadow: inherit;
        color: inherit;
        opacity: 0.6;
    }

    ::-webkit-scrollbar {
        display: none;
    }

    [hidden] {
        display: none !important;
    }

    [disabled] {
        opacity: 0.5;
        pointer-events: none;
    }

    section {
        margin: 10px 5px;
        @apply --card;
    }

    section > :not(:last-child) {
        border-bottom: solid 1px var(--border-color);
    }

    section.highlight {
        background: linear-gradient(rgb(89, 198, 255) 0%, rgb(7, 124, 185) 100%);
        color: var(--color-background);
        text-shadow: rgba(0, 0, 0, 0.2) 0px 2px 0px;
        border: none;
        --border-color: transparent;
    }

    section.highlight button, section.highlight pl-loading-button {
        font-weight: bold;
    }

    section.highlight.warning {
        background: linear-gradient(180deg, #f49300 0%, #f25b00 100%);
    }

    section.highlight.dark {
        background: linear-gradient(180deg, #555 0%, #222 100%);
    }

    .section-header {
        text-align: center;
        font-weight: bold;
        line-height: var(--row-height);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .section-row {
        display: flex;
        align-items: center;
        border-bottom: solid 1px rgba(0, 0, 0, 0.1);
    }

    .section-row-label {
        padding: 0 15px;
        flex: 1;
        @apply --ellipsis;
    }

    .section-row pl-icon {
        width: 50px;
        height: 50px;
    }

    header {
        display: flex;
        height: var(--row-height);
        background: var(--color-background);
        font-size: var(--font-size-default);
        position: relative;
        z-index: 1;
        border-bottom: solid 1px rgba(0, 0, 0, 0.15);
    }

    header > .title {
        line-height: var(--row-height);
        padding: 0 10px;
        flex: 1;
        font-weight: bold;
        text-align: center;
        @apply --ellipsis;
    }

    header pl-icon {
        height: var(--row-height);
        width: var(--row-height);
        font-size: 120%;
    }

    main {
        flex: 1;
        position: relative;
        box-sizing: border-box;
        @apply --scroll;
        overflow-x: hidden;
    }

    pl-dialog .message {
        padding: 15px;
        text-align: center;
    }

    pl-dialog button, pl-dialog pl-loading-button {
        width: 100%;
        box-sizing: border-box;
        font-weight: bold;
    }

    .spacer, [flex], [flex="1"] {
        flex: 1;
    }

    .tap {
        @apply --tap-highlight;
    }

    .tap::after {
        @apply --tap-highlight-after;
    }

    .tap:active::after {
        @apply --tap-highlight-active-after;
    }

    .tiles > :nth-child(8n + 1), .tiles-1 {
        @apply --shade-1;
    }

    .tiles > :nth-child(8n + 2), .tiles-2 {
        @apply --shade-2;
    }

    .tiles > :nth-child(8n + 3), .tiles-3 {
        @apply --shade-3;
    }

    .tiles > :nth-child(8n + 4), .tiles-4 {
        @apply --shade-4;
    }

    .tiles > :nth-child(8n + 5), .tiles-5 {
        @apply --shade-5;
    }

    .tiles > :nth-child(8n + 6), .tiles-6 {
        @apply --shade-4;
    }

    .tiles > :nth-child(8n + 7), .tiles-7 {
        @apply --shade-3;
    }

    .tiles > :nth-child(8n + 8), .tiles-8 {
        @apply --shade-2;
    }

    .ellipsis {
        @apply --ellipsis;
    }

    .rounded-corners {
        content: "";
        display: block;
        position: absolute;
        left: -10px;
        right: -10px;
        top: -10px;
        bottom: -10px;
        border: solid 10px var(--color-gutter);
        border-radius: calc(10px + var(--border-radius));
        z-index: 1;
        pointer-events: none;
        transform: translate3d(0, 0, 0);
    }

    pl-icon[spin] {
        animation: spin 1s infinite;
        transform-origin: center 49%;
    }

    .unlock-feature-hint {
        padding: 8px;
        text-align: center;
        background: var(--color-foreground);
        color: var(--color-background);
        font-size: var(--font-size-tiny);
        font-weight: bold;
    }

    .info {
        display: flex;
        align-items: center;
    }

    .info-icon {
        width: 80px;
        height: 80px;
        font-size: 60px;
        margin: 10px 0 10px 10px;
    }

    .info-body {
        padding: 20px 15px 20px 10px;
        flex: 1;
    }

    .info-title {
        font-size: 120%;
        font-weight: bold;
        margin-bottom: 5px;
    }

    .info-text {
        font-size: var(--font-size-small);
    }

    .stats {
        display: flex;
        align-items: center;
    }

    .stat {
        background: var(--color-foreground);
        color: var(--color-background);
        font-size: var(--font-size-micro);
        display: flex;
        align-items: center;
        border-radius: 20px;
        margin-right: 5px;
        padding: 2px 8px;
        font-weight: bold;
        text-align: center;
    }

    .stat pl-icon {
        width: 10px;
        height: 20px;
        margin-right: 4px;
        font-size: 10px;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    @keyframes slideIn {
        from { transform: translate(0, 50px); opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes rumble {
        25% {transform: translate(5px, 0);}
        50% {transform: translate(-5px, -3px);}
        75% {transform: translate(5px, 2px);}
    }
`;

const _documentContainer = document.createElement("template");
_documentContainer.setAttribute("style", "display: none;");

_documentContainer.innerHTML = `<dom-module id="shared">
    <template>
        <style>
${styles}
        </style>
    </template>
</dom-module>`;

document.head.appendChild(_documentContainer.content);

export default styles;
