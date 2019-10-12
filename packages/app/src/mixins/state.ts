import { BaseElement } from "../elements/base";
import { app } from "../globals";

type Constructor<T> = new (...args: any[]) => T;

export const StateMixin = <T extends Constructor<BaseElement>>(baseElement: T) =>
    class extends baseElement {
        get state() {
            return app.state;
        }

        _stateHandler = this.stateChanged.bind(this);

        connectedCallback() {
            if (super.connectedCallback) {
                super.connectedCallback();
            }

            app.subscribe(this._stateHandler);
            this.stateChanged();
        }

        disconnectedCallback() {
            app.unsubscribe(this._stateHandler);

            if (super.disconnectedCallback) {
                super.disconnectedCallback();
            }
        }

        /**
         * The `stateChanged()` method will be called when the state is updated.
         */
        protected stateChanged() {
            this.requestUpdate();
        }
    };
