"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
exports.__esModule = true;
var lit_element_1 = require("@polymer/lit-element");
var autosize_js_1 = require("autosize/src/autosize.js");
var shared_1 = require("../styles/shared");
var activeInput = null;
// On touch devices, blur active input when tapping on a non-input
document.addEventListener("touchend", function () {
    if (activeInput) {
        activeInput.blur();
    }
});
function mask(value) {
    return value && value.replace(/[^\n]/g, "\u2022");
}
var Input = /** @class */ (function (_super) {
    __extends(Input, _super);
    function Input() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(Input, "activeInput", {
        get: function () {
            return activeInput;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Input, "properties", {
        get: function () {
            return {
                autosize: Boolean,
                autocapitalize: Boolean,
                disabled: Boolean,
                focused: Boolean,
                invalid: Boolean,
                masked: Boolean,
                multiline: Boolean,
                pattern: String,
                placeholder: String,
                noTab: Boolean,
                readonly: Boolean,
                required: Boolean,
                type: String,
                selectOnFocus: Boolean,
                value: String
            };
        },
        enumerable: true,
        configurable: true
    });
    Input.prototype._render = function (props) {
        var masked = props.masked && !!props.value && !props.focused;
        // const inputAttrs = `
        //     id="input"
        //     value="${props.value}"
        //     placeholder$="${props.placeholder}"
        //     readonly$="${props.readonly}"
        //     tabindex$="${noTab ? "-1" : ""}"
        //     invisible$="${masked}"
        //     disabled$="${props.disabled}"
        //     autocapitalize$="${props.autocapitalize ? "" : "off"}"
        //     required$="${props.required}"
        //     autocomplete="off"
        //     spellcheck="false"
        //     autocorrect="off"
        //     on-focus="${e => this._focused(e)}"
        //     on-blur="${e => this._blurred(e)}"
        //     on-change="${e => this._changeHandler(e)}"
        //     on-keydown="${e => this._keydown(e)}"
        //     on-touchend="${e => this._stopPropagation(e)}"
        // `;
        // const maskAttrs = `
        //     value="${mask(value)}"
        //     invisible$="${!masked}"
        //     class="mask"
        //     tabindex="-1"
        //     disabled
        // `;
        // const input = props.multiline
        //     ? `<textarea ${inputAttrs} rows="1"></textarea><textarea ${maskAttrs}></textarea>`
        //     : `<input ${inputAttrs} type$="${props.type}" pattern$="${props.pattern}"><input ${maskAttrs}>`;
        return lit_element_1.html(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n        <style>\n            ", "\n\n            :host {\n                display: block;\n                position: relative;\n            }\n\n            :host(:not([multiline])) {\n                padding: 0 10px;\n                height: var(--row-height);\n            }\n\n            input {\n                box-sizing: border-box;\n                text-overflow: ellipsis;\n            }\n\n            input, textarea {\n                text-align: inherit;\n                width: 100%;\n                height: 100%;\n                min-height: inherit;\n                line-height: inherit;\n            }\n\n            .mask {\n                @apply --fullbleed;\n                pointer-events: none;\n                font-size: 150%;\n                line-height: 22px;\n                letter-spacing: -4.5px;\n                margin-left: -4px;\n            }\n\n            input[disabled], textarea[disabled] {\n                opacity: 1;\n                -webkit-text-fill-color: currentColor;\n            }\n\n            input[invisible], textarea[invisible] {\n                opacity: 0;\n            }\n        </style>\n\n        ", "\n"], ["\n        <style>\n            ", "\n\n            :host {\n                display: block;\n                position: relative;\n            }\n\n            :host(:not([multiline])) {\n                padding: 0 10px;\n                height: var(--row-height);\n            }\n\n            input {\n                box-sizing: border-box;\n                text-overflow: ellipsis;\n            }\n\n            input, textarea {\n                text-align: inherit;\n                width: 100%;\n                height: 100%;\n                min-height: inherit;\n                line-height: inherit;\n            }\n\n            .mask {\n                @apply --fullbleed;\n                pointer-events: none;\n                font-size: 150%;\n                line-height: 22px;\n                letter-spacing: -4.5px;\n                margin-left: -4px;\n            }\n\n            input[disabled], textarea[disabled] {\n                opacity: 1;\n                -webkit-text-fill-color: currentColor;\n            }\n\n            input[invisible], textarea[invisible] {\n                opacity: 0;\n            }\n        </style>\n\n        ", "\n"])), shared_1["default"], input);
    };
    Object.defineProperty(Input.prototype, "inputElement", {
        get: function () {
            return this.root.querySelector(this.multiline ? "textarea" : "input");
        },
        enumerable: true,
        configurable: true
    });
    Input.prototype._domChange = function () {
        var _this = this;
        if (this.autosize && this.multiline && this.inputElement) {
            autosize_js_1["default"](this.inputElement);
        }
        setTimeout(function () { return _this._valueChanged(); }, 50);
    };
    Input.prototype._stopPropagation = function (e) {
        e.stopPropagation();
    };
    Input.prototype._focused = function (e) {
        var _this = this;
        e.stopPropagation();
        this.focused = true;
        activeInput = this;
        this.dispatchEvent(new CustomEvent("focus"));
        if (this.selectOnFocus) {
            setTimeout(function () { return _this.selectAll(); }, 10);
        }
    };
    Input.prototype._blurred = function (e) {
        e.stopPropagation();
        this.focused = false;
        if (activeInput === this) {
            activeInput = null;
        }
        this.dispatchEvent(new CustomEvent("blur"));
    };
    Input.prototype._changeHandler = function (e) {
        e.stopPropagation();
        this.dispatchEvent(new CustomEvent("change"));
    };
    Input.prototype._keydown = function (e) {
        if (e.key === "Enter" && !this.multiline) {
            this.dispatchEvent(new CustomEvent("enter"));
            e.preventDefault();
            e.stopPropagation();
        }
        else if (e.key === "Escape") {
            this.dispatchEvent(new CustomEvent("escape"));
            e.preventDefault();
            e.stopPropagation();
        }
    };
    Input.prototype._valueChanged = function () {
        this.invalid = this.inputElement && !this.inputElement.checkValidity();
        if (this.autosize && this.multiline) {
            autosize_js_1["default"].update(this.inputElement);
        }
    };
    Input.prototype._tabIndex = function (noTab) {
        return noTab ? "-1" : "";
    };
    Input.prototype._mask = function (value) {
        return value && value.replace(/[^\n]/g, "\u2022");
    };
    Input.prototype._computeAutoCapitalize = function () {
        return this.autocapitalize ? "" : "off";
    };
    Input.prototype.focus = function () {
        this.inputElement.focus();
    };
    Input.prototype.blur = function () {
        this.inputElement.blur();
    };
    Input.prototype.selectAll = function () {
        try {
            this.inputElement.setSelectionRange(0, this.value.length);
        }
        catch (e) {
            this.inputElement.select();
        }
    };
    return Input;
}(lit_element_1.LitElement));
exports.Input = Input;
window.customElements.define("pl-input", Input);
var templateObject_1;
