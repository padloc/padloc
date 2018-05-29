import '../../../../../node_modules/@polymer/polymer/polymer-legacy.js';
import { PolymerElement, html } from '../../../../../node_modules/@polymer/polymer/polymer-element.js';
import "../../padlock.js";

window.Polymer = { html };
window.padlock = window.padlock || {};

padlock.BaseElement = class Base extends PolymerElement {

    truthy(val) {
        return !!val;
    }

    equals(val, ...vals) {
        return vals.some((v) => v === val);
    }

    identity(val) {
        return val;
    }

};
