import { BaseElement, element, html, css, property, listen } from "./base";
import { shared } from "../styles";

@element("pl-toggle")
export class Toggle extends BaseElement {
    @property({ reflect: true })
    active: boolean = false;
    @property() notap: boolean = false;

    static styles = [
        shared,
        css`
            :host {
                --width: var(--toggle-width, 36px);
                --height: var(--toggle-height, 24px);
                --gutter-width: var(--toggle-gutter-width, 2px);
                --color-off: var(--toggle-color-off, var(--color-foreground));
                --color-on: var(--toggle-color-on, var(--color-highlight));
                --color-knob: var(--toggle-color-knob, var(--color-background));

                display: inline-block;
                width: var(--width);
                height: var(--height);
                background: var(--color-off);
                border-radius: var(--height);

                transition: background 0.5s ease;
            }

            .knob {
                --size: calc(var(--height) - 2 * var(--gutter-width));
                display: block;
                height: var(--size);
                width: var(--size);
                margin: var(--gutter-width);
                background: var(--color-knob);
                border-radius: var(--size);

                transition: transform 0.5s cubic-bezier(1, -0.5, 0, 1.5) -0.2s, background 0.5s, opacity 0.5s;
            }

            :host([active]) {
                background: var(--color-on);
            }

            :host([active]) .knob {
                --dx: calc(var(--width) - var(--height));
                transform: translate(var(--dx), 0);
            }
        `
    ];

    render() {
        return html`
            <div class="knob"></div>
        `;
    }

    @listen("click")
    _click() {
        if (!this.notap) {
            this.toggle();
        }
    }

    toggle() {
        this.active = !this.active;
        this.dispatch("change", { value: this.active, prevValue: !this.active }, true, true);
    }
}
