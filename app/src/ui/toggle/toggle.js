import '../../styles/shared.js';
import '../base/base.js';

class Toggle extends padlock.BaseElement {
  static get template() {
    return Polymer.html`
        <style include="shared"></style>
        <style>
            :host {
                --width: var(--toggle-width, 45px);
                --height: var(--toggle-height, 30px);
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
        </style>

        <div class="knob"></div>
`;
  }

  static get is() { return "pl-toggle"; }

  static get properties() { return {
      active: {
          type: Boolean,
          value: false,
          notify: true,
          reflectToAttribute: true
      },
      notap: Boolean
  }; }

  connectedCallback() {
      super.connectedCallback();
      this.addEventListener("click", this._tap.bind(this));
  }

  _tap() {
      if (!this.notap) {
          this.toggle();
      }
  }

  toggle() {
      this.active = !this.active;

      this.dispatchEvent(new CustomEvent("change", { bubbles: true, composed: true }));
  }
}

window.customElements.define(Toggle.is, Toggle);
