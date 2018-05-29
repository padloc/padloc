import '../../styles/shared.js';
import '../base/base.js';
import '../locale/locale.js';

const { setClipboard } = padlock.platform;
const { LocaleMixin } = padlock;

class Clipboard extends LocaleMixin(padlock.BaseElement) {
  static get template() {
    return Polymer.html`
        <style include="shared">
            :host {
                display: flex;
                text-align: center;
                transition: transform 0.5s cubic-bezier(1, -0.3, 0, 1.3);
                position: fixed;
                left: 15px;
                right: 15px;
                bottom: 15px;
                z-index: 10;
                max-width: 400px;
                margin: 0 auto;
                border-radius: var(--border-radius);
                background: linear-gradient(90deg, rgb(89, 198, 255) 0%, rgb(7, 124, 185) 100%);
                color: var(--color-background);
                text-shadow: rgba(0, 0, 0, 0.2) 0 2px 0;
            }

            :host(:not(.showing)) {
                transform: translateY(130%);
            }

            .content {
                flex: 1;
                padding: 15px;
            }

            .name {
                font-weight: bold;
            }

            button {
                height: auto;
                line-height: normal;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }

            .countdown {
                font-size: var(--font-size-small);
            }
        </style>

        <div class="content">
            <div class="title">[[ \$l("Copied To Clipboard:") ]]</div>
            <div class="name">[[ record.name ]] / [[ field.name ]]</div>
        </div>

        <button class="tiles-2 tap" on-click="clear">
            <div><strong>[[ \$l("Clear") ]]</strong></div>
            <div class="countdown">[[ _tMinusClear ]]s<div>
        

    </div></div></button>
`;
  }

  static get is() { return "pl-clipboard"; }

  static get properties() { return {
      record: Object,
      field: Object
  }; }

  set(record, field, duration = 60) {
      clearInterval(this._interval);

      this.record = record;
      this.field = field;
      setClipboard(field.value); 

      this.classList.add("showing");

      const tStart = Date.now();

      this._tMinusClear = duration;
      this._interval = setInterval(() => {
          const dt = tStart + duration * 1000 - Date.now();
          if (dt <= 0) {
              this.clear();
          } else {
              this._tMinusClear = Math.floor(dt/1000);
          }
      }, 1000);

      return new Promise((resolve) => {
          this._resolve = resolve;
      });
  }

  clear() {
      clearInterval(this._interval);
      setClipboard(" ");
      this.classList.remove("showing");
      typeof this._resolve === "function" && this._resolve();
      this._resolve = null;
  }
}

window.customElements.define(Clipboard.is, Clipboard);

let clipboardSingleton;

padlock.ClipboardMixin = (baseClass) => {
    return class ClipboardMixin extends baseClass {

        setClipboard(record, field, duration) {
            if (!clipboardSingleton) {
                clipboardSingleton = document.createElement("pl-clipboard");
                document.body.appendChild(clipboardSingleton);
                clipboardSingleton.offsetLeft;
            }

            return clipboardSingleton.set(record, field, duration);
        }

        clearClipboard() {
            if (clipboardSingleton) {
                clipboardSingleton.clear();
            }
        }

    };
};
