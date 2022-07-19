import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

@customElement("pl-drawer")
export class Drawer extends LitElement {
    @property({ type: Boolean, reflect: true })
    collapsed: boolean = false;

    @state()
    private _innerSize = 0;

    @query(".inner")
    private _inner: HTMLDivElement;

    private _mutationObserver = new MutationObserver(() => this.updateInnerSize());
    private _intersectionObserver = new IntersectionObserver(() => this.updateInnerSize());

    connectedCallback() {
        super.connectedCallback();
        this._mutationObserver.observe(this, { childList: true, subtree: true });
        this._intersectionObserver.observe(this);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._mutationObserver.disconnect();
        this._intersectionObserver.disconnect();
    }

    updated() {
        this.style.height = this.collapsed ? "0" : `${this._innerSize}px`;
    }

    updateInnerSize() {
        setTimeout(() => (this._innerSize = (this._inner && this._inner.offsetHeight) || 0), 100);
    }

    static styles = [
        css`
            :host {
                display: block;
                overflow: hidden;
                transition: height 0.3s;
            }

            :host(.springy) {
                transition: height 0.4s cubic-bezier(0.08, 0.85, 0.3, 1.15) 0s;
            }

            :host([collapsed]) {
                height: 0;
            }
        `,
    ];

    render() {
        return html`
            <div class="inner">
                <slot></slot>
            </div>
        `;
    }
}
