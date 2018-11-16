import { html } from "@polymer/lit-element";
import { mixins, config } from "./";

export const listLayout = html`
<style>

    .list-layout {
        ${mixins.fullbleed()}
    }

    @media (min-width: ${config.narrowWidth}px) {

        .list-layout {
            display: flex;
        }

        .list-layout :first-child {
            width: 350px;
            border-right: solid 2px #ddd;
        }

        .list-layout :last-child {
            flex: 1;
        }

        .list-layout:not([show-detail]) :last-child {
            display: none;
        }

    }

    @media (max-width: ${config.narrowWidth}px) {
        .list-layout :first-child {
            ${mixins.fullbleed()}
            border: none;
        }

        .list-layout :last-child {
            ${mixins.fullbleed()}
            z-index: 10;
        }

        .list-layout :first-child,
        .list-layout :last-child {
            transition: transform 0.3s;
        }

        .list-layout[show-detail] :first-child {
            transform: translate(-50%, 0);
        }

        .list-layout:not([show-detail]) :last-child {
            transform: translate(100%, 0);
        }
    }
`;
