import { html } from "@polymer/lit-element";
import * as mixins from "./mixins";
import * as config from "./config";

export const shared = html`
<style>
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
        -webkit-font-smoothing: antialiased;
        -webkit-tap-highlight-color: transparent;
    }

    ::selection {
        background: var(--color-secondary);
        color: var(--color-tertiary);
    }

    a {
        text-decoration: underline;
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

    button {
        text-shadow: inherit;
    }

    input, select {
        border: none;
        -webkit-appearance: none;
        -mox-appearance: none;
        appearance: none;
        font-family: inherit;
        font-size: inherit;
        font-weight: inherit;
        text-shadow: inherit;
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

    h1, h2 {
        margin: 20px;
        display: flex;
        align-items: center;
        text-align: left;
        font-weight: normal;
    }

    h1 pl-icon, h2 pl-icon {
        position: relative;
        font-size: 90%;
    }

    h1 {
        font-size: 150%;
    }

    h2 {
        font-size: 120%;
        margin: 20px 10px 8px 15px;
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

    [invisible] {
        visibility: hidden;
    }

    [disabled] {
        opacity: 0.5;
        pointer-events: none;
    }

    section {
        margin: 10px 5px;
    }

    section > button {
        width: 100%;
    }

    header {
        display: flex;
        height: var(--row-height);
        background: var(--color-background);
        font-size: var(--font-size-default);
        z-index: 1;
        border-bottom: solid 1px #ddd;
        align-items: center;
    }

    header > .title {
        line-height: var(--row-height);
        padding: 0 10px;
        flex: 1;
        font-weight: bold;
        text-align: center;
        ${mixins.ellipsis()}
    }

    header pl-icon {
        margin: 5px;
        border-radius: 100%;
        overflow: hidden;
        font-size: 120%;
    }

    header.back-header {
        border: none;
        align-items: center;
        padding-left: 15px;
        color: var(--color-primary);
        margin-top: 10px;
        z-index: 2;
        height: 40px;
    }

    header.back-header pl-icon {
        font-size: 90%;
        width: 20px;
        top: 1px;
        margin: 0;
    }

    main {
        flex: 1;
        box-sizing: border-box;
        ${mixins.scroll()}
        overflow-x: hidden;
    }

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
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

    .layout {
        display: flex;
    }

    .layout.vertical {
        flex-direction: column;
    }

    .layout.align-center {
        align-items: center;
    }

    .layout.justify-center {
        justify-content: center;
    }

    .spacer, .flex, [flex] {
        flex: 1;
    }

    .tap {
        ${mixins.tapHighlight()}
    }

    .tap::after {
        ${mixins.tapHighlightAfter()}
    }

    .tap:active::after {
        ${mixins.tapHighlightActiveAfter()}
    }

    .tiles > :nth-child(8n + 1), .tiles-1 {
        ${mixins.shade1()}
    }

    .tiles > :nth-child(8n + 2), .tiles-2 {
        ${mixins.shade2()}
    }

    .tiles > :nth-child(8n + 3), .tiles-3 {
        ${mixins.shade3()}
    }

    .tiles > :nth-child(8n + 4), .tiles-4 {
        ${mixins.shade4()}
    }

    .tiles > :nth-child(8n + 5), .tiles-5 {
        ${mixins.shade5()}
    }

    .tiles > :nth-child(8n + 6), .tiles-6 {
        ${mixins.shade4()}
    }

    .tiles > :nth-child(8n + 7), .tiles-7 {
        ${mixins.shade3()}
    }

    .tiles > :nth-child(8n + 8), .tiles-8 {
        ${mixins.shade2()}
    }

    .ellipsis {
        ${mixins.ellipsis()}
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
        font-size: 46px;
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

    .tags {
        display: flex;
        overflow-x: auto;
        margin: 8px 0;
        align-items: center;
        -webkit-overflow-scrolling: touch;
    }

    .tags::after {
        content: "";
        display: block;
        width: 1px;
        flex: none;
    }

    .tag {
        color: var(--color-background);
        font-weight: bold;
        border-radius: var(--border-radius);
        font-size: var(--font-size-tiny);
        white-space: nowrap;
        height: 30px;
        line-height: 30px;
        padding: 0 8px;
        text-align: center;
        ${mixins.gradientDark(true)}
    }

    .tag:not(:last-child) {
        margin-right: 6px;
    }

    .tag > * {
        display: inline-block;
        vertical-align: top;
    }

    .tag pl-icon {
        width: 20px;
        height: 30px;
        margin-right: 4px;
        margin-left: -2px;
    }

    .tag.ghost {
        border: dashed 1px;
        background: transparent;
        color: var(--color-foreground);
    }

    .tag.highlight {
        ${mixins.gradientHighlight(true)}
        color: var(--color-tertiary);
        text-shadow: rgba(0, 0, 0, 0.1) 0 1px 0;
    }

    .tag.warning {
        color: var(--color-tertiary);
        ${mixins.gradientWarning(true)}
    }

    .tags.small .tag {
        font-size: var(--font-size-micro);
        height: 25px;
        line-height: 25px;
    }

    .tags.small pl-icon {
        font-size: 10px;
        margin-right: 0;
        width: 16px;
        height: 25px;
    }

    .record-tag.store-tag {
        ${mixins.gradientDark(true)}
        text-shadow: rgba(0, 0, 0, 0.1) 0 1px 0;
    }

    .fabs {
        position: absolute;
        z-index: 2;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        display: flex;
        align-items: center;
    }

    .fab {
        pointer-events: auto;
        border-radius: 100%;
        margin: 15px;
        background: var(--color-secondary);
        color: var(--color-tertiary);
    }

    .fab:not(:last-child) {
        margin-right: 0;
    }

    .fab.destructive {
        ${mixins.gradientWarning(true)}
    }

    .empty-placeholder {
        ${mixins.fullbleed()}
        display: flex;
        flex-direction: column;
        ${mixins.fullbleed()}
        top: var(--row-height);
        overflow: visible;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 20px;
    }

    .empty-placeholder pl-icon {
        width: 100px;
        height: 100px;
        font-size: 50px;
    }

    .empty-placeholder > div {
        width: 200px;
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

    @media (min-width: ${config.narrowWidth + 1}px) {
        .menu-button {
            visibility: hidden;
        }

        .narrow {
            display: none;
        }
    }

    @media (max-width: ${config.narrowWidth}px) {
        .wide {
            display: none;
        }
    }
</style>
`;
