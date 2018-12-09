import { html } from "@polymer/lit-element";
import * as mixins from "./mixins";
import * as config from "./config";

export const listLayout = html`
<style>

    .list-layout {
        ${mixins.fullbleed()}
        perspective: 1000px;
    }

    .list-layout > * {
        border-radius: var(--border-radius);
        overflow: hidden;
        will-change: transform;
    }

    @media (min-width: ${config.narrowWidth}px) {
        .list-layout {
            display: flex;
        }

        .list-layout > :first-child {
            width: 350px;
            margin-right: var(--gutter-size);
        }

        .list-layout > :last-child {
            flex: 1;
        }

        .list-layout:not([show-detail]) > :last-child {
            display: none;
        }

    }

    @media (max-width: ${config.narrowWidth}px) {
        .list-layout > :first-child {
            margin: 0;
            ${mixins.fullbleed()}
        }

        .list-layout > :last-child {
            ${mixins.fullbleed()}
            z-index: 10;
        }

        .list-layout > :first-child,
        .list-layout > :last-child {
            transition: transform 0.3s cubic-bezier(0.6, 0, 0.2, 1);
        }

        .list-layout[show-detail] > :first-child {
            transform: translate3d(0, 0, -50px);
        }

        .list-layout:not([show-detail]) > :last-child {
            transform: translate(100%, 0);
        }
    }
`;
