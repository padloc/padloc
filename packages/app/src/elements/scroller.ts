import { BaseElement, element, html, css, query } from "./base";

@element("pl-scroller")
export class Scroller extends BaseElement {
    get scrollTop() {
        return this._content.scrollTop;
    }

    set scrollTop(val: number) {
        this._content.scrollTop = val;
    }

    get scrollLeft() {
        return this._content.scrollLeft;
    }

    set scrollLeft(val: number) {
        this._content.scrollLeft = val;
    }

    @query(".shadow.top")
    private _shadowTop: HTMLElement;

    @query(".shadow.bottom")
    private _shadowBottom: HTMLElement;

    @query(".content")
    private _content: HTMLElement;

    private _intersectionObserver = new IntersectionObserver(() => this._scroll());
    private _mutationObserver = new MutationObserver(() => this._scroll());

    connectedCallback() {
        super.connectedCallback();
        this._intersectionObserver.observe(this);
        this._mutationObserver.observe(this, { childList: true, subtree: true });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._intersectionObserver.disconnect();
        this._mutationObserver.disconnect();
    }

    private _scroll() {
        const content = this._content;
        const x = Math.min(content.scrollTop / 30, 1);
        const y = Math.min((content.scrollHeight - content.offsetHeight - content.scrollTop) / 30, 1);
        this._shadowTop.style.boxShadow = `rgba(0, 0, 0, ${x * 0.3}) 0 1px ${x * 6}px -3px`;
        this._shadowBottom.style.boxShadow = `rgba(0, 0, 0, ${y * 0.3}) 0 -1px ${y * 6}px -3px`;
        this.dispatchEvent(new CustomEvent("scroll"));
    }

    static styles = [
        css`
            :host {
                display: flex;
                flex-direction: column;
                overflow: hidden;
                position: relative;
            }

            .content {
                flex: 1;
                overflow: auto;
            }

            .shadow {
                position: absolute;
                left: 0;
                right: 0;
                height: 10px;
                z-index: 1;
            }

            .shadow.top {
                top: -10px;
            }

            .shadow.bottom {
                bottom: -10px;
            }

            :host([hide-scrollbar]) ::-webkit-scrollbar {
                display: none;
            }
        `,
    ];

    render() {
        return html`
            <div class="shadow top"></div>

            <div class="content" @scroll=${this._scroll}>
                <slot></slot>
            </div>

            <div class="shadow bottom"></div>
        `;
    }
}
