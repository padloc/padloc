import "@polymer/polymer/polymer-legacy";
import { PolymerElement, html } from "@polymer/polymer/polymer-element";
import "../../padlock.js";

window.Polymer = { html };

export class BaseElement extends PolymerElement {

    truthy(val) {
        return !!val;
    }

    equals(val, ...vals) {
        return vals.some(v => v === val);
    }

    identity(val) {
        return val;
    }

}

padlock.BaseElement = BaseElement;
