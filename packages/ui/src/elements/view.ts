import { BaseElement, property } from "./base.js";

export class View extends BaseElement {
    @property() active: boolean = false;

    _shouldRender() {
        return this.active;
    }
}
