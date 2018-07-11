import "reflect-metadata";
import { LitElement, html } from "@polymer/lit-element";
export { html };

export { TemplateResult } from "lit-html";

export interface BasePrototype extends BaseElement {}

export interface EventListenerDeclaration {
    eventName: string;
    target?: string | EventTarget;
    handler: (event?: Event) => void;
}

export interface ChangeRecord {
    path: string;
    value: any;
    oldValue: any;
}

export type ObserveHandler = (changeRecords: ChangeRecord[]) => void;

export class BaseElement extends LitElement {
    static properties?: { [prop: string]: { type: any; reflect: string | boolean } };
    static __listeners?: EventListenerDeclaration[];
    static __observers?: { [name: string]: ObserveHandler[] };

    private _$: { [id: string]: HTMLElement } = {};
    private _$$: { [id: string]: NodeList } = {};

    /**
     * Find first element macthing the selector in the element's shadow root, caching the result
     * @param selector query selector string
     */
    $(sel: string, cached = true): HTMLElement {
        if (!cached || !this._$[sel]) {
            const e = this.shadowRoot!.querySelector(sel);
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
    $$(sel: string, cached = true): NodeList {
        if (!cached || !this._$[sel]) {
            const e = this.shadowRoot!.querySelectorAll(sel);
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
        const listeners = (<typeof BaseElement>this.constructor).__listeners;
        if (!listeners) {
            return;
        }
        for (const listener of listeners) {
            if (listener.eventName && listener.handler) {
                const target = listener.target
                    ? typeof listener.target === "string"
                        ? this.$(listener.target)
                        : listener.target
                    : this;
                if (target && target.addEventListener) {
                    target.addEventListener(listener.eventName, e => {
                        listener.handler.call(this, e);
                    });
                }
            }
        }
    }

    _propertiesChanged(currentProps: object, changedProps: object, oldProps: object): void {
        const observers = (<typeof BaseElement>this.constructor).__observers;
        const properties = (<typeof BaseElement>this.constructor).properties;
        const map = new Map<ObserveHandler, ChangeRecord[]>();
        for (const propName in changedProps) {
            const property = properties && properties[propName];

            if (property && property.reflect) {
                const attr = property.reflect === true ? propName : property.reflect;
                const value = changedProps[propName];
                if (value === true) {
                    this.setAttribute(attr, "");
                } else if (value === false) {
                    this.removeAttribute(attr);
                } else {
                    this.setAttribute(attr, value);
                }
            }

            const handlers = observers && observers[propName];
            if (handlers && handlers.length) {
                const changeRecord: ChangeRecord = {
                    path: propName,
                    value: changedProps[propName],
                    oldValue: oldProps[propName]
                };
                for (const handler of handlers) {
                    if (!map.has(handler)) {
                        map.set(handler, [changeRecord]);
                    } else {
                        map.get(handler)!.push(changeRecord);
                    }
                }
            }
        }
        for (const handler of map.keys()) {
            handler.call(this, map.get(handler));
        }
        super._propertiesChanged(currentProps, changedProps, oldProps);
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

/**
 * Decorator to declate a property
 */
export function property(opts: { reflect: boolean | string } = { reflect: false }) {
    return (prototype: any, propertyName: string) => {
        const constructor = prototype.constructor;
        if (!constructor.hasOwnProperty("properties")) {
            Object.defineProperty(constructor, "properties", { value: {} });
        }
        constructor.properties[propertyName] = {
            type: getType(prototype, propertyName) || String,
            reflect: opts.reflect
        };
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
export function query(selector: string, cached = true) {
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
export function queryAll(selector: string, cached = true) {
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
 * @param eventName name of event, e.g. 'click'
 * @param selector EventTarget or a selector to the node to listen to e.g. '#myButton'
 */
export function listen(eventName: string, target?: string | EventTarget) {
    return (prototype: any, methodName: string) => {
        const constructor = prototype.constructor;
        if (!constructor.hasOwnProperty("__listeners")) {
            Object.defineProperty(constructor, "__listeners", { value: [] });
        }
        const listeners: EventListenerDeclaration[] = constructor.__listeners;
        listeners.push({
            eventName,
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
        const constructor = prototype.constructor;
        if (!constructor.hasOwnProperty("__observers")) {
            Object.defineProperty(constructor, "__observers", { value: {} });
        }
        const observers: { [name: string]: ObserveHandler[] } = constructor.__observers;
        for (const prop of properties) {
            if (!observers[prop]) {
                observers[prop] = [];
            }
            observers[prop].push(prototype[methodName]);
        }
    };
}
