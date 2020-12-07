import { BaseElement, element, property, html, css, query } from "./base";

@element("pl-drawer")
export class Drawer extends BaseElement {
    @property()
    collapsed: boolean = false;

    @property()
    private _innerSize = 0;

    @query(".inner")
    private _inner: HTMLDivElement;

    private _mutationObserver = new MutationObserver(() => this._updateInnerSize());
    private _intersectionObserver = new IntersectionObserver(() => this._updateInnerSize());

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

    private _updateInnerSize() {
        setTimeout(() => (this._innerSize = (this._inner && this._inner.offsetHeight) || 0), 100);
    }

    static styles = [
        css`
            :host {
                display: block;
                overflow: hidden;
                transition: height 0.3s;
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
