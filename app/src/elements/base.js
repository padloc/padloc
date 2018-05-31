import "@polymer/polymer/polymer-legacy.js";
import { PolymerElement, html } from "@polymer/polymer/polymer-element.js";

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

export { html };
