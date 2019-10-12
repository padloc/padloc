import { loadScript } from "../lib/util";
import { shared } from "../styles";
import { BaseElement, element, html, property, css } from "./base";
import Nunito from "../../assets/fonts/Nunito-Regular.ttf";

@element("pl-card-input")
export class CardInput extends BaseElement {
    @property()
    stripePubKey = "pk_test_jTF9rjIV9LyiyJ6ir2ARE8Oy";

    @property()
    error = "";

    private _stripe: any;
    private _cardElement: any;

    async getToken() {
        this.error = "";

        const { token, error } = await this._stripe.createToken(this._cardElement);

        if (error) {
            this.error = error.message;
            this.dispatch("change", { error: this.error });
            throw error;
        }

        return token.id;
    }

    async connectedCallback() {
        super.connectedCallback();

        const Stripe = await loadScript("https://js.stripe.com/v3/", "Stripe");

        const stripe = (this._stripe = Stripe(this.stripePubKey));
        const elements = stripe.elements({
            fonts: [
                {
                    src: `local("Nunito Regular"), local("Nunito-Regular"), url(${Nunito}) format("truetype")`,
                    family: "Nunito",
                    style: "normal",
                    weight: 400
                }
            ]
        });
        const card = (this._cardElement = elements.create("card", {
            iconStyle: "solid",
            hidePostalCode: true,
            style: {
                base: {
                    fontFamily: '"Nunito", "Helvetica Neue", Helvetica, sans-serif',
                    fontSmoothing: "antialiased",
                    fontSize: "18px"
                },
                invalid: {
                    // color: "#ff6666",
                    // textShadow: "none"
                }
            }
        }));
        const cardElement = document.createElement("div");
        this.appendChild(cardElement);
        card.mount(cardElement);
        card.addEventListener("change", (e: any) => {
            this.error = (e.error && e.error.message) || "";
            this.dispatch("change", { error: this.error });
        });
    }

    static styles = [
        shared,
        css`
            :host {
                display: block;
                padding: 14px 0 14px 12px;
                border-radius: var(--border-radius);
                background: var(--color-shade-1);
            }

            :host(.item) {
                background: var(--color-tertiary);
                border: solid 1px var(--color-shade-1);
                border-bottom-width: 3px;
                margin: var(--gutter-size);
            }
        `
    ];

    render() {
        return html`
            <slot></slot>
        `;
    }
}
