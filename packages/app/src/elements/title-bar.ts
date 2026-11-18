import { customElement } from "lit/decorators.js";
import { html, LitElement } from "lit";
import { shared, mixins } from "../styles";

@customElement("pl-title-bar")
export class TitleBar extends LitElement {
    render() {
        return html`
            ${shared}

            <style>

                :host {
                    height: var(--title-bar-height);
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 10;
                    -webkit-app-region: drag;
                    background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%);
                }

                .title {
                    ${mixins.fullbleed()};
                    text-align: center;
                    line-height: var(--title-bar-height);
                    pointer-events: none;
                    color: var(--color-background);
                    font-size: var(--font-size-small);
                    ${mixins.fontWeightWithIcon(700)}
                }

                .buttons {
                    display: flex;
                    align-items: center;
                    ${mixins.fullbleed()};
                }

                :host(:not(.macos):not(.linux)) .buttons.macos-linux,
                :host(:not(.windows)) .buttons.windows {
                    display: none;
                }

                .buttons.windows {
                    justify-content: flex-end;
                }

                .buttons.macos-linux button {
                    width: 12px;
                    height: 12px;
                    padding: 0;
                    border: solid 1px rgba(0, 0, 0, 0.05);
                    box-sizing: border-box;
                    border-radius: 100%;
                    margin-left: 10px;
                    font-size: 10px;
                    text-align: center;
                    position: relative;
                    cursor: pointer;
                    -webkit-app-region: no-drag;
                }

                .buttons.macos-linux button svg {
                    width: 10px;
                    height: 10px;
                    line-height: 10px;
                    ${mixins.absoluteCenter()};
                }

                .buttons.macos-linux button:not(:hover) svg {
                    opacity: 0;
                }

                .buttons.macos-linux button.close {
                    background: #FF6058;
                }

                .buttons.macos-linux button.minimize {
                    background: #FFBF2F;
                }

                .buttons.macos-linux button.maximize {
                    background: #28CA42;
                    transform: rotate(45deg);
                }

                .buttons.windows button {
                    color: var(--color-background);
                    width: var(--title-bar-height);
                    height: var(--title-bar-height);
                    padding: 0;
                    box-sizing: border-box;
                    position: relative;
                    cursor: pointer;
                    -webkit-app-region: no-drag;
                    line-height: var(--title-bar-height);
                    text-align: center;
                }

                .buttons.windows button:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .buttons.windows button.close:hover {
                    background: #FF6058;
                }

                button svg {
                    width: 1em;
                    height: 1em;
                    fill: none;
                    stroke: currentColor;
                    stroke-width: 1.75;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }
            </style>

            <div class="title">${process.env.PL_APP_NAME}</div>

            <div class="buttons macos-linux">
                <button class="close" aria-label="Close window" @click=${() => this._close()}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M5 5l14 14M19 5 5 19" />
                    </svg>
                </button>
                <button class="minimize" aria-label="Minimize window" @click=${() => this._minimize()}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14" /></svg>
                </button>
                <button class="maximize" aria-label="Maximize window" @click=${() => this._maximize()}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5h14v14H5z" /></svg>
                </button>
            </div>

            <div class="buttons windows">
                <button class="minimize" aria-label="Minimize window" @click=${() => this._minimize()}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14" /></svg>
                </button>
                <button class="maximize" aria-label="Maximize window" @click=${() => this._maximize()}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5h14v14H5z" /></svg>
                </button>
                <button class="close" aria-label="Close window" @click=${() => this._close()}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M5 5l14 14M19 5 5 19" />
                    </svg>
                </button>
            </div>
        `;
    }

    private _close() {
        // TODO
        // require("electron")
        //     .remote.getCurrentWindow()
        //     .close();
    }

    private _minimize() {
        // TODO
        // require("electron")
        //     .remote.getCurrentWindow()
        //     .minimize();
    }

    private _maximize() {
        // TODO
        // var win = require("electron").remote.getCurrentWindow();
        // win.setFullScreen(!win.isFullScreen());
    }
}
