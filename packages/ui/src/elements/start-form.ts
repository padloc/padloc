import { shared } from "../styles";
import { BaseElement, html } from "./base.js";
import { animateCascade } from "../animation.js";
import "./icon.js";

export const sharedStyles = html`
    ${shared}

    <style>
        @keyframes reveal {
            from { transform: translate(0, 30px); opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes fade {
            to { transform: translate(0, -200px); opacity: 0; }
        }

        :host {
            @apply --fullbleed;
            @apply --scroll;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        form {
            width: 100%;
            max-width: 400px;
        }

        form > * {
            border-radius: 8px;
            margin: 10px;
        }

        .logo {
            width: 90px;
            font-size: 125%;
        }

        .title {
            font-size: 250%;
            margin-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        pl-loading-button {
            overflow: hidden;
            font-weight: bold;
        }
    </style>
`;

export class StartForm extends BaseElement {
    reset() {
        animateCascade(this.$$("form > *"), {
            animation: "reveal",
            duration: 1000,
            fullDuration: 1500,
            initialDelay: 300,
            fill: "backwards",
            clear: 3000
        });
        this.requestRender();
    }

    done() {
        animateCascade(this.$$("form > *"), {
            animation: "fade",
            duration: 400,
            fullDuration: 600,
            initialDelay: 0,
            fill: "forwards",
            easing: "cubic-bezier(1, 0, 0.2, 1)",
            clear: 3000
        });
    }
}
