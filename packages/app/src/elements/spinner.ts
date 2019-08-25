import { BaseElement, element, html, css, svg, property, query, observe } from "./base";

@element("pl-spinner")
export class Spinner extends BaseElement {
    static styles = [
        css`
            @keyframes spin {
                from {
                    stroke-dashoffset: 240;
                }

                to {
                    stroke-dashoffset: 40;
                }
            }

            @keyframes rotate {
                to {
                    transform: rotate(360deg);
                }
            }

            :host {
                display: block;
                width: 40px;
                height: 40px;
                position: relative;
                transition: opacity 0.3s;
                will-change: opacity;
            }

            :host(:not([active])) {
                opacity: 0;
            }

            svg {
                width: 100%;
                height: 100%;
            }

            circle {
                fill: none;
                stroke: currentColor;
                stroke-linecap: round;
                stroke-width: 10;
                stroke-dasharray: 252;
                transform-origin: center center;
                will-change: transform;
            }

            circle.spinning {
                animation: spin 1.5s cubic-bezier(0.44, 0.22, 0.64, 0.86) alternate infinite,
                    rotate linear 1.2s infinite;
            }
        `
    ];

    @property({ reflect: true })
    active: boolean = false;

    @query("circle")
    private _circle: SVGCircleElement;

    private _stopTimeout: number;

    @observe("active")
    _activeChanged() {
        clearTimeout(this._stopTimeout);

        if (this.active) {
            this._circle.classList.add("spinning");
        } else {
            this._stopTimeout = window.setTimeout(() => this._circle.classList.remove("spinning"), 300);
        }
    }

    render() {
        return html`
            ${svg`
                <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" />
                </svg>
            `}
        `;
    }
}
