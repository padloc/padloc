import { LitElement } from "@polymer/lit-element";
import { State, App } from "@padlock/core/lib/app.js";
import { app } from "../init";

export type Constructor<T = {}> = new (...args: any[]) => T;
export interface StateMixin {
    app: App;
    _stateChanged(state: State): void;
}

export function StateMixin<T extends Constructor<LitElement>>(superClass: T): Constructor<StateMixin> & T {
    return class StateMixin extends superClass {
        app = app;

        constructor(..._: any[]) {
            super();

            this.app.addEventListener("state-changed", () => {
                this._stateChanged && this._stateChanged(app.state);
            });
        }

        _stateChanged(_: State) {
            this.requestRender();
        }
    };
}
