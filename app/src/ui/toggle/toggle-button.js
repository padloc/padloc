import '../../styles/shared.js';
import '../base/base.js';
import './toggle.js';

class ToggleButton extends padlock.BaseElement {
  static get template() {
    return Polymer.html`
        <style include="shared">
            :host {
                display: inline-block;
                font-size: inherit;
                height: var(--row-height);
                padding: 0 15px;
            }

            button {
                display: flex;
                width: 100%;
                align-items: center;
                height: 100%;
                padding: 0;
                line-height: normal;
                text-align: left;
            }

            button > div {
                flex: 1;
            }

            :host(:not([reverse])) button > div {
                padding-left: 0.5em;
            }

            :host([reverse]) button {
                flex-direction: row-reverse;
            }

            pl-toggle {
                display: inline-block;
                pointer-events: none;
            }
        </style>

        <button on-click="toggle">
            <pl-toggle id="toggle" active="{{ active }}"></pl-toggle>
            <div>[[ label ]]</div>
        </button>
`;
  }

  static get is() { return "pl-toggle-button"; }

  static get properties() { return {
      active: {
          type: Boolean,
          value: false,
          notify: true,
          reflectToAttribute: true
      },
      label: {
          type: String,
          value: ""
      },
      reverse: {
          type: Boolean,
          value: false,
          reflectToAttribute: true
      }
  }; }

  toggle() {
      this.$.toggle.toggle();
  }
}

window.customElements.define(ToggleButton.is, ToggleButton);
