import "../styles/shared.js";
import { formatDateUntil, isFuture } from "@padlock/core/lib/util.js";
import { BaseElement, html } from "./base.js";
import "./icon.js";
import { LocaleMixin } from "../mixins";

class Promo extends LocaleMixin(BaseElement) {
    static get template() {
        return html`
        <style include="shared">

            button {
                width: 100%;
                font-weight: bold;
                height: auto;
                padding: 15px;
                line-height: normal;
                font-size: 110%;
                border-top: solid 1px rgba(0, 0, 0, 0.3);
            }

            .redeem-within {
                font-size: var(--font-size-tiny);
            }

            .info-icon::after {
                font-family: var(--font-family);
                content: "%";
                color: var(--color-secondary);
                width: 25px;
                height: 25px;
                font-size: 23px;
                position: absolute;
                top: 27px;
                left: 34px;
                font-weight: bold;
                text-shadow: none;
                display: block;
                transform: rotate(45deg);
            }
        </style>

        <div class="info">
            <pl-icon class="info-icon" icon="tag"></pl-icon>
            <div class="info-body">
                <div class="info-title">[[ promo.title ]]</div>
                <div class="info-text">[[ promo.description ]]</div>
            </div>
        </div>

        <button class="tap" on-click="_redeem">
            <div>[[ \$l("Redeem Now") ]]</div>
            <div class="redeem-within" hidden\$="[[ !truthy(promo.redeemWithin) ]]">[[ \$l("Expires In") ]] [[ _redeemCountDown ]]</div>
        </button>
`;
    }

    static get is() {
        return "pl-promo";
    }

    static get properties() {
        return {
            promo: Object
        };
    }

    static get observers() {
        return ["_setupCountdown(promo.redeemWithin)"];
    }

    _setupCountdown() {
        clearInterval(this._countdown);
        const p = this.promo;
        if (p && p.redeemWithin) {
            this._countdown = setInterval(() => {
                this._redeemCountDown = formatDateUntil(p.created, p.redeemWithin);
                if (!isFuture(p.created, p.redeemWithin)) {
                    this.dispatchEvent(new CustomEvent("promo-expired"));
                }
            }, 1000);
        }
    }

    _redeem() {
        this.dispatchEvent(new CustomEvent("promo-redeem"));
    }
}

window.customElements.define(Promo.is, Promo);
