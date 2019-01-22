import { shared, mixins } from "../styles";
import { BaseElement, html, property } from "./base.js";
import { animateElement, animateCascade } from "../animation.js";
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

        :host, .wrapper {
            ${mixins.fullbleed()}
            ${mixins.scroll()}
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

        pl-logo {
            margin: 30px auto;
        }

        pl-loading-button {
            overflow: hidden;
            font-weight: bold;
        }

        .hint {
            font-size: var(--font-size-small);
            box-sizing: border-box;
            padding: 0 10px;
            margin-bottom: 30px;
            transition: color 0.2s;
        }

        .hint.warning {
            color: #ffc107;
            font-weight: bold;
            margin: 0;
            padding: 0;
            text-shadow: none;
        }
    </style>
`;

export abstract class StartForm extends BaseElement {
    protected _animateIn(nodes: Iterable<Node | Element>) {
        return animateCascade(nodes, {
            animation: "reveal",
            duration: 1000,
            fullDuration: 1500,
            initialDelay: 300,
            fill: "backwards",
            clear: 3000
        });
    }

    protected _animateOut(nodes: Iterable<Node | Element>) {
        animateCascade(nodes, {
            animation: "fade",
            duration: 400,
            fullDuration: 600,
            initialDelay: 0,
            fill: "forwards",
            easing: "cubic-bezier(1, 0, 0.2, 1)",
            clear: 3000
        });
    }

    reset() {
        this._animateIn(this.$$(".animate"));
        this.requestUpdate();
    }

    done() {
        this._animateOut(this.$$(".animate"));
    }

    rumble() {
        animateElement(this.$("form"), { animation: "rumble", duration: 200, clear: true });
    }
}
