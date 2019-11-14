import { EventEmitter } from "@padloc/core/src/event-target";

export class Router extends EventEmitter {
    history: string[] = [];

    constructor(public basePath = "/") {
        super();
        window.addEventListener("popstate", () => {
            this._pathChanged();
        });
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

        this.dispatch("route-changed", { path, direction });
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
        history.pushState(
            { historyIndex: this.history.length - 1 },
            "",
            this.basePath + this.path + "?" + new URLSearchParams(params).toString()
        );
    }

    get canGoBack() {
        return this.history.length > 1;
    }

    go(path: string, params?: { [prop: string]: string }, replace = false) {
        const queryString = new URLSearchParams(params || this.params).toString();

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
            this._pathChanged();
        }
    }

    forward() {
        history.forward();
    }

    back(alternate = "") {
        if (this.canGoBack) {
            history.back();
        } else {
            this.go(alternate);
        }
    }
}
