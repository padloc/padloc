import '../../styles/shared.js';
import '../base/base.js';
import '../locale/locale.js';
import './dialog.js';

const defaultButtonLabel = $l("OK");

class DialogAlert extends padlock.BaseElement {
  static get template() {
    return Polymer.html`
        <style include="shared">
            :host {
                --pl-dialog-inner: {
                    background: linear-gradient(rgb(89, 198, 255) 0%, rgb(7, 124, 185) 100%);
                };
            }

            :host([type="warning"]) {
                --pl-dialog-inner: {
                    background: linear-gradient(180deg, #f49300 0%, #f25b00 100%);
                };
            }

            :host([type="plain"]) {
                --pl-dialog-inner: {
                    background: var(--color-background);
                };
            }

            :host([hide-icon]) .info-icon {
                display: none;
            }

            :host([hide-icon]) .info-text,
            :host([hide-icon]) .info-title {
                text-align: center;
            }

            .info-text:not(.small) {
                font-size: var(--font-size-default);
            }
        </style>

        <pl-dialog id="dialog" open="{{ open }}" prevent-dismiss="[[ preventDismiss ]]" on-dialog-dismiss="_dialogDismiss">
            <div class="info" hidden\$="[[ _hideInfo(title, message) ]]">
                <pl-icon class="info-icon" icon="[[ _icon(type) ]]"></pl-icon>
                <div class="info-body">
                    <div class="info-title">[[ title ]]</div>
                    <div class\$="info-text [[ _textClass(title) ]]">[[ message ]]</div>
                </div>
            </div>
            <template is="dom-repeat" items="[[ options ]]">
                <button on-click="_selectOption" class\$="[[ _buttonClass(index) ]]">[[ item ]]</button>
            </template>
        </pl-dialog>
`;
  }

  static get is() { return "pl-dialog-alert"; }

  static get properties() { return {
      buttonLabel: { type: String, value: defaultButtonLabel },
      title: { type: String, value: ""},
      message: { type: String, value: "" },
      options: { type: Array, value: ["OK"] },
      preventDismiss: { type: Boolean, value: false },
      type: { type: String, value: "info", reflectToAttribute: true },
      hideIcon: { type: Boolean, value: false, reflectToAttribute: true },
      open: { type: Boolean, value: false }
  }; }

  show(message = "", { title = "", options = ["OK"], type = "info", preventDismiss = false, hideIcon = false } = {}) {
      this.message = message;
      this.title = title;
      this.type = type;
      this.preventDismiss = preventDismiss;
      this.options = options;
      this.hideIcon = hideIcon;

      setTimeout(() => this.open = true, 10);

      return new Promise((resolve) => {
          this._resolve = resolve;
      });
  }

  _icon() {
      switch (this.type) {
          case "info":
              return "info-round";
          case "warning":
              return "error";
          case "success":
              return "success";
          case "question":
              return "question";
      }
  }

  _selectOption(e) {
      this.open = false;
      typeof this._resolve === "function" && this._resolve(this.options.indexOf(e.model.item));
      this._resolve = null;
  }

  _dialogDismiss() {
      typeof this._resolve === "function" && this._resolve();
      this._resolve = null;
  }

  _textClass() {
      return this.title ? "small" : "";
  }

  _buttonClass(index) {
      return "tap tiles-" + (Math.floor((index + 1) % 8) + 1);
  }

  _hideInfo() {
      return !this.title && !this.message;
  }
}

window.customElements.define(DialogAlert.is, DialogAlert);
