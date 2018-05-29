import '../../../../../node_modules/@polymer/paper-spinner/paper-spinner-lite.js';
import '../base/base.js';
import '../icon/icon.js';

class LoadingButton extends padlock.BaseElement {
  static get template() {
    return Polymer.html`
        <style include="shared">
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

        <button type="button" class\$="[[ _buttonClass(_loading, _success, _fail) ]]" tabindex\$="[[ _tabIndex(noTab) ]]">
            <div class="label"><slot></slot></div>
            <paper-spinner-lite active="[[ _loading ]]" class="spinner"></paper-spinner-lite>
            <pl-icon icon="check" class="icon-success"></pl-icon>
            <pl-icon icon="cancel" class="icon-fail"></pl-icon>
        </button>
`;
  }

  static get is() { return "pl-loading-button"; }

  static get properties() { return {
      _fail: {
          type: Boolean,
          value: false
      },
      _loading: {
          type: Boolean,
          value: false
      },
      _success: {
          type: Boolean,
          value: false
      },
      label: {
          type: String,
          value: ""
      },
      noTab: {
          type: Boolean,
          value: false
      }
  }; }

  start() {
      clearTimeout(this._stopTimeout);
      this._success = this._fail = false;
      this._loading = true;
  }

  stop() {
      this._success = this._fail = this._loading = false;
  }

  success() {
      this._loading = this._fail = false;
      this._success = true;
      this._stopTimeout = setTimeout(() => this.stop(), 1000);
  }

  fail() {
      this._loading = this._success = false;
      this._fail = true;
      this._stopTimeout = setTimeout(() => this.stop(), 1000);
  }

  _tabIndex(noTab) {
      return noTab ? "-1" : "";
  }

  _buttonClass() {
      return this._loading ? "loading" : this._success ? "success" : this._fail ? "fail" : "";
  }
}

window.customElements.define(LoadingButton.is, LoadingButton);
