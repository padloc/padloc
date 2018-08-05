import { BaseElement, property, observe } from "./base.js";

export class View extends BaseElement {
    @property() active: boolean = false;

    _shouldRender() {
        return this.active;
    }

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
