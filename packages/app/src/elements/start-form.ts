import { mixins, shared } from "../styles";
import { Routing } from "../mixins/routing";
import { StateMixin } from "../mixins/state";
import { animateElement, animateCascade } from "../lib/animation";
import { Logo } from "./logo";
import "./icon";
import { css, LitElement } from "lit";
import { query, state } from "lit/decorators.js";
import { base64ToString } from "@padloc/core/src/encoding";

export abstract class StartForm extends Routing(StateMixin(LitElement)) {
    static styles = [
        shared,
        css`
            @keyframes reveal {
                from {
                    transform: translate(0, 30px);
                    opacity: 0;
                }
            }

            @keyframes fade {
                to {
                    transform: translate(0, -200px);
                    opacity: 0;
                }
            }

            :host {
                transition: opacity 1s;
            }

            :host(:not([active])) {
                pointer-events: none;
                opacity: 0;
            }

            :host,
            .wrapper {
                display: flex;
                flex-direction: column;
                align-items: center;
                ${mixins.fullbleed()};
                ${mixins.scroll()};
            }

            form {
                width: 100%;
                box-sizing: border-box;
                max-width: 25em;
                box-shadow: var(--start-form-shadow);
                border-radius: 1em;
                background: var(--start-form-background, var(--color-background));
            }

            pl-logo {
                margin: 1.5em auto;
                color: var(--color-background);
                height: var(--start-logo-height, 5em);
                width: var(--start-logo-width, auto);
            }

            .hint {
                font-size: var(--font-size-small);
                box-sizing: border-box;
                padding: var(--spacing);
                transition: color 0.2s;
            }
        `,
    ];

    protected get _authToken() {
        return this.router.params.authToken || "";
    }

    protected get _deviceTrusted() {
        return this.router.params.deviceTrusted === "true";
    }

    protected get _email() {
        return this.router.params.email || "";
    }

    protected get _name() {
        return this.router.params.name || "";
    }

    @state()
    protected get _invite(): {
        id: string;
        invitor: string;
        orgId: string;
        orgName: string;
        email: string;
    } | null {
        try {
            return JSON.parse(base64ToString(this.router.params.invite));
        } catch (e) {
            return null;
        }
    }

    @query("pl-logo")
    protected _logo: Logo;

    protected _animateIn(nodes: Iterable<Node | Element>) {
        return animateCascade(nodes, {
            animation: "reveal",
            duration: 1000,
            fullDuration: 1500,
            initialDelay: 300,
            fill: "backwards",
            clear: 3000,
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
            clear: 3000,
        });
    }

    updated(changes: Map<string, any>) {
        if (changes.has("active")) {
            this.active ? this.reset() : this.done();
        }
    }

    reset() {
        this._animateIn(this.renderRoot.querySelectorAll(".animated:not([collapsed])"));
        this.requestUpdate();
        this._logo && setTimeout(() => (this._logo.reveal = true), 500);
    }

    done() {
        this._animateOut(this.renderRoot.querySelectorAll(".animated:not([collapsed])"));
    }

    rumble() {
        animateElement(this.renderRoot.querySelector("form")!, { animation: "rumble", duration: 200, clear: true });
    }
}
