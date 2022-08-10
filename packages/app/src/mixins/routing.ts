import { translate as $l } from "@padloc/locale/src/translate";
import { LitElement } from "lit";
import { property } from "lit/decorators.js";
import { app, router } from "../globals";

type Constructor<T> = new (...args: any[]) => T;

export const Routing = <T extends Constructor<LitElement>>(baseElement: T) => {
    abstract class M extends baseElement {
        router = router;

        @property({ type: Boolean, reflect: true })
        active: boolean = false;

        get hasChanges(): boolean {
            return false;
        }

        clearChanges(): any {}

        protected readonly routePattern: RegExp = /$^/;

        private _routeHandler = () => this.routeChanged(router.path, router.params);
        private _beforeRouteChangedHandler = (e: Event) => this._beforeRouteChanged(e);
        private _beforeUnloadHandler = (e: Event) => this._beforeUnload(e);

        shouldUpdate(changes: Map<string, any>) {
            return changes.has("active") || this.active;
        }

        connectedCallback() {
            super.connectedCallback();
            router.addEventListener("before-route-changed", this._beforeRouteChangedHandler);
            router.addEventListener("route-changed", this._routeHandler);
            window.addEventListener("beforeunload", this._beforeUnloadHandler);
            app.loaded.then(() => this._routeHandler());
        }

        disconnectedCallback() {
            super.disconnectedCallback();
            router.removeEventListener("route-changed", this._routeHandler);
            router.removeEventListener("before-route-changed", this._beforeRouteChangedHandler);
            window.removeEventListener("beforeunload", this._beforeUnloadHandler);
        }

        async go(
            path: string | null,
            params: { [param: string]: string | undefined } = router.params,
            replace = false,
            force = false
        ) {
            for (const [prop, value] of Object.entries(params)) {
                if (typeof value === "undefined") {
                    delete params[prop];
                }
            }

            router.go(path !== null ? path : router.path, params as { [param: string]: string }, replace, force);
        }

        redirect(path: string) {
            this.go(path, undefined, true);
        }

        protected matchRoute(path: string): string[] | null {
            const match = path.match(this.routePattern);

            if (!match) {
                this.active = false;
                return null;
            }

            this.active = true;

            return match.slice(1);
        }

        protected _beforeRouteChanged(e: Event) {
            if (this.active && this.hasChanges) {
                if (confirm($l("Are you sure you want to leave this page? Any changes will be lost."))) {
                    this.clearChanges();
                } else {
                    e.preventDefault();
                }
            }
        }

        protected _beforeUnload(e: Event) {
            if (this.active && this.hasChanges) {
                e.preventDefault();
                e.returnValue = false;
            }
        }

        protected routeChanged(path: string, params: { [prop: string]: string }) {
            const args = this.matchRoute(path);

            if (args) {
                this.handleRoute(args, params, path);
            }
        }

        protected handleRoute(_args: string[], _params: { [prop: string]: string }, _path: string) {}
    }

    return M;
};
