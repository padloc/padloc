import { BaseElement, property } from "../elements/base";
import { router } from "../globals";

type Constructor<T> = new (...args: any[]) => T;

export const Routing = <T extends Constructor<BaseElement>>(baseElement: T) => {
    class M extends baseElement {
        router = router;

        @property({ type: Boolean, reflect: true })
        active: boolean = false;

        protected readonly routePattern: RegExp = /$^/;

        private _routeHandler = () => this.routeChanged(router.path, router.params);

        shouldUpdate(changes: Map<string, any>) {
            return changes.has("active") || this.active;
        }

        connectedCallback() {
            super.connectedCallback();
            router.addEventListener("route-changed", this._routeHandler);
            this._routeHandler();
        }

        disconnectedCallback() {
            super.disconnectedCallback();
            removeEventListener("route-changed", this._routeHandler);
        }

        go(
            path: string | null,
            params: { [param: string]: string | number | Date | undefined } = {},
            replace?: boolean
        ) {
            params = { ...router.params, ...params };

            for (const [prop, value] of Object.entries(params)) {
                if (typeof value === "undefined") {
                    delete params[prop];
                } else if (typeof value === "number") {
                    params[prop] = value.toString();
                }
            }

            router.go(path !== null ? path : router.path, params as { [param: string]: string }, replace);
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
