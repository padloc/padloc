export class Router extends EventTarget {
    history: string[] = [];

    constructor(public basePath = "") {
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

        this.dispatchEvent(new CustomEvent("route-changed", { detail: { path, direction } }));
    }

    get path() {
        return window.location.pathname.replace(new RegExp("^" + this.basePath), "");
    }

    go(path: string) {
        if (path !== this.path) {
            history.pushState({ historyIndex: this.history.length }, "", this.basePath + path);
            this._pathChanged();
        }
    }

    forward() {
        history.forward();
    }

    back() {
        history.back();
    }
}
