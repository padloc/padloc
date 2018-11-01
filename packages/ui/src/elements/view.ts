import { BaseElement, property, observe } from "./base.js";

export abstract class View extends BaseElement {
    @property()
    active: boolean = false;

    @observe("active")
    _activeChanged() {
        if (this.active) {
            this._activated();
        } else {
            this._deactivated();
        }
    }

    protected _activated() {}

    protected _deactivated() {}
}
