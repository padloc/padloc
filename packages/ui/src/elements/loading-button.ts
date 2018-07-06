import { LitElement, html } from "@polymer/lit-element";
import "@polymer/paper-spinner/paper-spinner-lite.js";
import sharedStyles from "../styles/shared.js";
import "./icon.js";

type ButtonStatus = "idle" | "loading" | "success" | "fail";

class LoadingButton extends LitElement {
    static get properties() {
        return {
            status: String,
            label: String,
            noTab: Boolean
        };
    }

    constructor() {
        super();
        this.status = "idle";
        this.label = "";
        this.noTab = false;
    }

    _render(props: { status: ButtonStatus; label: string; noTab: boolean }) {
        return html`
        <style>
            ${sharedStyles}

            :host {
                display: flex;
            }

            button {
                position: relative;
                flex: 1;
            }

            button > * {
                @apply --absolute-center;
                transition: transform 0.2s cubic-bezier(1, -0.3, 0, 1.3), opacity 0.2s;
            }

            button > .label {
                @appy --fullbleed;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            button.loading .label, button.success .label, button.fail .label,
            button:not(.loading) .spinner,
            button:not(.success) .icon-success,
            button:not(.fail) .icon-fail {
                opacity: 0.5;
                transform: scale(0);
            }

            button pl-icon {
                font-size: 120%;
            }

            paper-spinner-lite {
                line-height: normal;
                --paper-spinner-color: currentColor;
                --paper-spinner-stroke-width: 2px;
            }
        </style>

        <button type="button" class$="${props.status}" tabindex$="{ props.noTab ? "-1" : "" }">

            <div class="label"><slot></slot></div>

            <paper-spinner-lite active="${props.status == "loading"}" class="spinner"></paper-spinner-lite>

            <pl-icon icon="check" class="icon-success"></pl-icon>

            <pl-icon icon="cancel" class="icon-fail"></pl-icon>
        </button>
`;
    }

    static get is() {
        return "pl-loading-button";
    }

    start() {
        clearTimeout(this._stopTimeout);
        this.status = "loading";
    }

    stop() {
        this.status = "idle";
    }

    success() {
        this.status = "success";
        this._stopTimeout = setTimeout(() => this.stop(), 1000);
    }

    fail() {
        this.status = "fail";
        this._stopTimeout = setTimeout(() => this.stop(), 1000);
    }
}

window.customElements.define(LoadingButton.is, LoadingButton);
