import { EventTarget } from "event-target-shim";

export class Router extends EventTarget {
    history: string[] = [];

    private _forceNextUpdate = false;

    constructor(public basePath = "/") {
        super();
        window.addEventListener("popstate", () => this._pathChanged());
        this._pathChanged();
    }

    private _pathChanged() {
        const index = (history.state && history.state.historyIndex) || 0;
        const path = this.path;
        const direction = this.history.length - 1 < index ? "forward" : "backward";

        if (this.history.length === index) {
            this.history.push(path);
        } else
            while (this.history.length - 1 > index) {
                this.history.pop();
            }

        const canceled =
            !this._forceNextUpdate &&
            !this.dispatchEvent(
                // @ts-ignore
                new CustomEvent("before-route-changed", { detail: { path, direction }, cancelable: true })
            );

        if (canceled) {
            this._forceNextUpdate = true;
            direction === "forward" ? this.back() : this.forward();
            return;
        } else {
            this._forceNextUpdate = false;
        }

        // @ts-ignore
        this.dispatchEvent(new CustomEvent("route-changed", { detail: { path, direction } }));
    }

    get path() {
        return window.location.pathname.replace(new RegExp("^" + this.basePath), "");
    }

    get params() {
        const params = {};
        for (const [key, value] of new URLSearchParams(window.location.search)) {
            params[key] = value;
        }
        return params;
    }

    set params(params: { [prop: string]: string }) {
        history.replaceState(
            { historyIndex: this.history.length - 1 },
            "",
            this.basePath + this.path + "?" + new URLSearchParams(params).toString()
        );
        // @ts-ignore
        this.dispatchEvent(new CustomEvent("params-changed", { detail: { params } }));
    }

    setParams(params: { [prop: string]: string | undefined }) {
        const existing = this.params;
        for (const [prop, value] of Object.entries(params)) {
            if (typeof value === "undefined") {
                delete existing[prop];
            } else {
                existing[prop] = value;
            }
        }
        this.params = existing;
    }

    get canGoBack() {
        return this.history.length > 1;
    }

    go(path: string, params?: { [prop: string]: string }, replace = false, force = false) {
        params = params || this.params;

        // Clean out properties with value undefined
        for (const [key, value] of Object.entries(params)) {
            if (typeof value === "undefined") {
                delete params[key];
            }
        }

        const queryString = new URLSearchParams(params).toString();

        if (path !== this.path || queryString !== window.location.search) {
            let url = this.basePath + path;
            if (queryString) {
                url += "?" + queryString;
            }

            if (replace) {
                history.replaceState({ historyIndex: this.history.length - 1 }, "", url);
            } else {
                history.pushState({ historyIndex: this.history.length }, "", url);
            }
            this._forceNextUpdate = force;
            this._pathChanged();
        }
    }

    forward(_force = false) {
        history.go(1);
    }

    back(alternate = "") {
        if (this.canGoBack) {
            history.go(-1);
        } else {
            this.go(alternate);
        }
    }
}
