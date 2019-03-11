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

    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    input[type="number"] {
        -moz-appearance: textfield;
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
        padding: 12px 15px;
        cursor: pointer;
        text-align: center;
        text-shadow: inherit;
    }

    button.icon {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    button.icon pl-icon {
        width: 30px;
        height: 20px;
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

    button, pl-loading-button, pl-toggle-button, a.button {
        background: var(--color-btn-back);
        border-radius: var(--border-radius);
    }

    button.primary, pl-loading-button.primary, a.button.primary {
        background: var(--color-highlight);
        color: var(--color-tertiary);
        font-weight: bold;
    }

    button.negative, pl-loading-button.negative, a.button.negative {
        background: var(--color-negative);
        color: var(--color-tertiary);
        font-weight: bold;
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
        margin: 20px 20px 10px 20px;
    }

    h2 {
        font-size: 120%;
        margin: 10px 20px 5px 20px;
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
        opacity: 0;
    }

    [disabled] {
        opacity: 0.5;
        pointer-events: none !important;
    }

    section {
        margin: 10px 5px;
    }

    section > button {
        width: 100%;
    }

    header {
        display: flex;
        font-size: 120%;
        padding: 10px;
        background: var(--color-tertiary);
        z-index: 1;
        border-bottom: solid 3px var(--color-shade-1);
        align-items: center;
        font-weight: bold;
    }

    header pl-input {
        height: auto;
        background: transparent;
        padding: 0 5px;
    }

    header .title {
        padding: 0 5px;
        text-align: center;
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

    li, .item {
        border-radius: var(--border-radius);
        background: var(--color-tertiary);
        border: solid 1px var(--color-shade-1);
        border-bottom-width: 3px;
        margin: var(--gutter-size);
        /*box-shadow: 0px 5px 5px -5px var(--color-shade-2), 0 0 2px var(--color-shade-1);*/
    }

    li.padded, .item.padded {
        padding: 8px;
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

    .tap:not(:active):hover::after {
        ${mixins.tapHighlightHoverAfter()}
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
        color: var(--color-tertiary);
        /*text-shadow: rgba(0, 0, 0, 0.2) 0 1px 0;*/
        font-weight: bold;
        border-radius: var(--border-radius);
        font-size: var(--font-size-tiny);
        padding: 5px 8px;
        line-height: normal;
        text-align: center;
        background: var(--color-secondary);
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
        height: 20px;
        margin-right: 4px;
        margin-left: -2px;
    }

    .tag.ghost {
        border: dashed 1px;
        background: transparent;
        color: var(--color-foreground);
    }

    .tag.highlight {
        background: var(--color-highlight);
    }

    .tag.warning {
        background: var(--color-negative);
    }

    .tags.small .tag {
        font-size: var(--font-size-micro);
        padding: 4px 6px;
    }

    .tags.small pl-icon {
        font-size: 10px;
        margin-right: 0;
        width: 16px;
        height: 16px;
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
        margin: 12px;
        box-shadow: #000 0 1px 5px -2px;
        color: var(--color-tertiary);
        width: 46px;
        height: 46px;
        text-shadow: rgba(0, 0, 0, 0.2) 0 2px 0px;
        background: var(--color-secondary);
    }

    .fab.primary {
        background: var(--color-primary);
    }

    .fab:not(:last-child) {
        margin-right: 0;
    }

    .fab.destructive {
        background: var(--color-negative);
    }

    .centering {
        display: flex;
        align-items: center;
        justify-content: center;
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

    .input-wrapper {
        display: flex;
        align-items: center;
        padding: 0 10px;
    }

    .input-wrapper pl-input {
        padding: 0;
        background: transparent;
    }

    .tabs {
        display: flex;
        margin: 0 auto;
        width: auto;
        ${mixins.scroll("horizontal")}
        font-size: var(--font-size-default);
        font-weight: bold;
    }

    .tabs > * {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px 15px;
    }

    .tabs > * > pl-icon {
        margin-left: -12px;
    }

    .tabs > *[active] {
        color: var(--color-highlight);
    }

    .tabs > *[active]::before {
        content: "";
        display: block;
        width: 100%;
        height: 3px;
        background: currentColor;
        position: absolute;
        left: 0;
        bottom: 0;
    }

    header > .tabs {
        margin: -10px -10px -12px -10px;
    }

    .search-wrapper {
        display: flex;
        align-items: center;
    }

    .search-wrapper pl-icon {
        opacity: 0.5;
        margin-left: 5px;
    }

    .search-wrapper pl-input {
        font-size: var(--font-size-small);
        height: auto;
        flex: 1;
        background: transparent;
        padding-left: 5px;
    }

    .note {
        padding: 0;
        font-size: var(--font-size-small);
        font-weight: bold;
        padding: 8px;
        box-shadow: rgba(0, 0, 0, 0.3) 0 0 3px 0;
        text-shadow: rgba(0, 0, 0, 0.2) 0 2px 0;
        background: var(--color-primary);
    }

    .note.error {
        background: var(--color-negative);
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
            display: none !important;
        }
    }

    @media (max-width: ${config.narrowWidth}px) {
        .wide {
            display: none;
        }
    }
</style>
`;
