import "reflect-metadata";
import { EventTarget, Event } from "@padloc/core/src/event-target";
import { LitElement, html, css, svg } from "lit-element";
import { UpdatingElement, PropertyDeclaration } from "lit-element/lib/updating-element";
export { html, css, svg };

export interface BasePrototype extends BaseElement {}

export interface ListenerDeclaration {
    name: string;
    handler: (e?: Event) => void;
    target?: string | EventTarget;
}

export interface Listener {
    name: string;
    target: EventTarget;
    handler: (e: Event) => void;
}

export interface Observer {
    props: string[];
    handler: (changed: Map<string, any>) => void;
}

export class BaseElement extends LitElement {
    private static _listeners?: ListenerDeclaration[];
    private static _observers?: Observer[];

    private _$: { [id: string]: HTMLElement } = {};
    private _$$: { [id: string]: NodeList } = {};
    private _listeners: Listener[] = [];

    /**
     * Find first element macthing the selector in the element's shadow root, caching the result
     * @param selector query selector string
     */
    $(sel: string, cached = false): HTMLElement {
        if (!cached || !this._$[sel]) {
            const e = this.renderRoot!.querySelector(sel);
            if (e) {
                this._$[sel] = e as HTMLElement;
            }
        }
        return this._$[sel];
    }

    /**
     * Find first element macthing the selector in the element's shadow root, caching the result
     * @param selector query selector string
     */
    $$(sel: string, cached = false): NodeList {
        if (!cached || !this._$[sel]) {
            const e = this.renderRoot!.querySelectorAll(sel);
            if (e) {
                this._$$[sel] = e;
            }
        }
        return this._$$[sel];
    }

    /**
     * Fires a custom event with the specified name
     * @param name Name of the event
     * @param detail Optional event detail object
     * @param bubbles Optional - if the event bubbles. Default is TRUE.
     * @param composed Optional - if the event bubbles past the shadow root. Default is TRUE.
     */
    dispatch(name: string, detail?: any, bubbles: boolean = true, composed: boolean = true) {
        if (name) {
            const init: any = {
                bubbles: typeof bubbles === "boolean" ? bubbles : true,
                composed: typeof composed === "boolean" ? composed : true
            };
            if (detail) {
                init.detail = detail;
            }
            this.dispatchEvent(new CustomEvent(name, init));
        }
    }

    get node(): HTMLElement {
        return (this as any) as HTMLElement;
    }

    connectedCallback() {
        super.connectedCallback();

        const declarations = (<typeof BaseElement>this.constructor)._listeners;
        if (!declarations) {
            return;
        }

        for (const decl of declarations) {
            (async () => {
                let targets: EventTarget[] = [];

                if (!decl.target) {
                    targets = [(this as any) as EventTarget];
                } else if (typeof decl.target === "string") {
                    // a string target property indicates that the target is a child of this element,
                    // so we have to make sure the renderRoot is created first
                    await this.updateComplete;
                    targets = (this.$$(decl.target) as any) as EventTarget[];
                } else if (typeof decl.target.addEventListener === "function") {
                    targets = [decl.target];
                }

                if (!targets.length) {
                    throw "invalid event target: " + decl.target;
                }

                const handler = (e: Event) => {
                    decl.handler.call(this, e);
                };
                for (const target of targets) {
                    target.addEventListener(decl.name, handler);
                    this._listeners.push({
                        target,
                        handler,
                        name: decl.name
                    });
                }
            })();
        }
    }

    disconnectedCallback() {
        let listener;
        while ((listener = this._listeners.pop())) {
            listener.target.removeEventListener(listener.name, listener.handler);
        }
    }

    updated(changed: Map<string, any>): void {
        let proto = this;

        do {
            const observers = (<typeof BaseElement>proto.constructor)._observers;
            if (!observers) {
                return;
            }

            for (const observer of observers) {
                if (observer.props.some(p => changed.has(p))) {
                    observer.handler.call(this, changed);
                }
            }
        } while (proto instanceof BaseElement && (proto = Object.getPrototypeOf(proto)));
    }
}

/**
 * Decorator for defining a new custom element
 * @param name tag name of custom element
 */
export function element(name: string) {
    return (c: any) => {
        if (name) {
            window.customElements.define(name, c);
        }
    };
}

export function property(options?: PropertyDeclaration) {
    return (proto: Object, name: string) => {
        options = options || {};
        if (!options.type) {
            // @ts-ignore
            options.type = getType(proto, name);
        }
        (proto.constructor as typeof UpdatingElement).createProperty(name, options);
    };
}

function getType(prototype: any, propertyName: string): any {
    if (Reflect.hasMetadata) {
        if (Reflect.hasMetadata("design:type", prototype, propertyName)) {
            return Reflect.getMetadata("design:type", prototype, propertyName);
        }
    }
    return null;
}

/**
 * Decorator to create a getter for the specified selector
 * @param selector selector to find the element
 */
export function query(selector: string, cached = false) {
    return (prototype: BasePrototype, propertyName: string) => {
        Object.defineProperty(prototype, propertyName, {
            get() {
                return (this as BasePrototype).$(selector, cached);
            },
            enumerable: true,
            configurable: true
        });
    };
}

/**
 * Decorator to create a getter that returns a nodelist of all
 * elements matching the selector
 * @param selector selector query
 */
export function queryAll(selector: string, cached = false) {
    return (prototype: BasePrototype, propertyName: string) => {
        Object.defineProperty(prototype, propertyName, {
            get() {
                return (this as BasePrototype).$$(selector, cached);
            },
            enumerable: true,
            configurable: true
        });
    };
}

/**
 * Decorator to add event handlers
 * @param name name of event, e.g. 'click'
 * @param selector EventTarget or a selector to the node to listen to e.g. '#myButton'
 */
export function listen(name: string, target?: string | EventTarget) {
    return (prototype: any, methodName: string) => {
        const { constructor } = prototype;
        if (!constructor.hasOwnProperty("_listeners")) {
            Object.defineProperty(constructor, "_listeners", { value: [] });
        }
        constructor._listeners.push({
            name,
            target,
            handler: prototype[methodName]
        });
    };
}

/**
 * Decortator to define an observer that gets called back
 * whenever any of the specified property is updated
 * @param properties list of properties to observe
 */
export function observe(...properties: string[]) {
    return (prototype: any, methodName: string) => {
        const { constructor } = prototype;
        if (!constructor.hasOwnProperty("_observers")) {
            Object.defineProperty(constructor, "_observers", { value: [] });
        }
        constructor._observers.push({
            props: properties,
            handler: prototype[methodName]
        });
    };
}
