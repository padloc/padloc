import '../../styles/shared.js';
import '../base/base.js';
import '../locale/locale.js';
import './dialog.js';

class DialogOptions extends padlock.BaseElement {
  static get template() {
    return Polymer.html`
        <style include="shared"></style>

        <pl-dialog open="{{ open }}" prevent-dismiss="[[ preventDismiss ]]" on-dialog-dismiss="_dismiss">
            <template is="dom-if" if="[[ _hasMessage(message) ]]" restamp="">
                <div class="message tiles-1">[[ message ]]</div>
            </template>
            <template is="dom-repeat" items="[[ options ]]">
                <button class\$="[[ _buttonClass(index) ]]" on-click="_selectOption">[[ item ]]</button>
            </template>
        </pl-dialog>
`;
  }

  static get is() { return "pl-dialog-options"; }

  static get properties() { return {
      message: { type: String, value: "" },
      open: { type: Boolean, value: false },
      options: { type: Array, value: [$l("Dismiss")] },
      preventDismiss: { type: Boolean, value: false }
  }; }

  choose(message, options) {
      this.message = message || "";
      this.options = options || this.options;

      setTimeout(() => this.open = true, 50);

      return new Promise((resolve) => {
          this._resolve = resolve;
      });
  }

  _selectOption(e) {
      this.open = false;
      typeof this._resolve === "function" && this._resolve(this.options.indexOf(e.model.item));
      this._resolve = null;
  }

  _buttonClass(index) {
      return "tap tiles-" + (Math.floor((index + 1) % 8) + 1);
  }

  _hasMessage(message) {
      return !!message;
  }

  _dismiss() {
      typeof this._resolve === "function" && this._resolve(-1);
      this._resolve = null;
  }
}

window.customElements.define(DialogOptions.is, DialogOptions);
