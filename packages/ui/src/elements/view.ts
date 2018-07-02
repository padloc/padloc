import { LitElement } from "@polymer/lit-element";
import { State, App } from "@padlock/core/lib/app.js";
import { app } from "../init";

export class View extends LitElement {
    app: App = app;

    constructor() {
        super();

        this.app.addEventListener("state-changed", () => {
            this._stateChanged && this._stateChanged(app.state);
        });
    }

    protected _stateChanged(_: State) {
        this.requestRender();
    }
}
