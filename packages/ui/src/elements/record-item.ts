import { Record, Field } from "@padlock/core/lib/data.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { setClipboard } from "../clipboard.js";
import sharedStyles from "../styles/shared.js";
import { BaseElement, element, html, property } from "./base.js";
import "./icon.js";

@element("pl-record-item")
export class RecordItem extends BaseElement {
    @property() record: Record;

    _shouldRender() {
        return !!this.record;
    }

    _render({ record }: this) {
        return html`
        <style>
            ${sharedStyles}

            :host {
                display: block;
                cursor: pointer;
                vertical-align: top;
                box-sizing: border-box;
                flex-direction: row;
                position: relative;
                /* transition: color 0.3s; */
                margin: 6px 6px 0 6px;
                /* transform: translate3d(0, 0, 0); */
                @apply --card;
            }

            .header {
                height: var(--row-height);
                line-height: var(--row-height);
                position: relative;
                display: flex;
                align-items: center;
            }

            .name {
                padding-left: 15px;
                @apply --ellipsis;
                font-weight: bold;
                /* min-width: 150px; */
            }

            .fields {
                position: relative;
                display: flex;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
            }

            .fields::after {
                content: "";
                display: block;
                width: 6px;
                flex: none;
            }

            .field {
                cursor: pointer;
                font-size: var(--font-size-tiny);
                line-height: 35px;
                height: 35px;
                text-align: center;
                position: relative;
                flex: 1;
                font-weight: bold;
                margin: 0 0 6px 6px;
                border-radius: 8px;
                @apply --shade-2;
            }

            .field > * {
                transition: transform 0.2s cubic-bezier(1, -0.3, 0, 1.3), opacity 0.2s;
            }

            .copied-message {
                @apply --fullbleed;
                border-radius: inherit;
            }

            .field:not(.copied) .copied-message, .field.copied .field-label {
                opacity: 0;
                transform: scale(0);
            }

            .copied-message {
                font-weight: bold;
                background: var(--color-primary);
                color: var(--color-background);
            }

            .copied-message::before {
                font-family: "FontAwesome";
                content: "\\f00c\\ ";
            }

            :host(:not([multi-select])) .field:hover {
                @apply --shade-3;
            }

            .field-label {
                padding: 0 15px;
                @apply --ellipsis;
            }

            .tags {
                display: flex;
                align-items: center;
                padding-right: 8px;
            }

            .tag {
                font-size: 12px;
                max-width: 60px;
                border-radius: 6px;
                padding: 4px 7px;
                margin-right: 4px;
                line-height: normal;
                font-weight: bold;
                background: var(--color-foreground);
                color: var(--color-background);
            }

            .highlight {
                content: "";
                display: block;
                background: linear-gradient(90deg, #59c6ff 0%, #077cb9 100%);
                transition-property: opacity, transform;
                transition-duration: 0.2s;
                transition-timing-function: cubic-bezier(0.6, 0, 0.2, 1);
                @apply --fullbleed;
                transform: scale(1, 0);
                opacity: 0;
                border-radius: 5px;
            }

            :host([selected]) {
                color: var(--color-background);
            }

            :host(:focus:not([selected])) {
                border-color: var(--color-highlight);
                color: #4ca8d9;
            }

            :host([selected]) .highlight {
                transform: scale(1, 1);
                opacity: 1;
            }
        </style>

        <div class="highlight"></div>

        <div class="header">

            <div class="name" disabled?="${!record.name}">${record.name || $l("No Name")}</div>

            <div class="spacer"></div>

            <div class="tags">
                ${this._limitTags().map(
                    (t: string) => html`
                        <div class="ellipsis tag">${t}</div>
                    `
                )}
            </div>

        </div>

        <div class="fields">

            ${record.fields.map(
                (f: Field, i: number) => html`
                    <div class="field" on-click="${(e: MouseEvent) => this._copyField(e, i)}">

                        <div class="field-label">${f.name}</div>

                        <div class="copied-message">${$l("copied")}</div>

                    </div>
                `
            )}

            <div class="field" disabled hidden?="${!!record.fields.length}">${$l("No Fields")}</div>

        </div>
`;
    }

    private _copyField(e: Event, index: number) {
        if (!this.record) {
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        setClipboard(this.record, this.record.fields[index]);
        const fieldEl = this.$$(".field")[index] as HTMLElement;
        fieldEl.classList.add("copied");
        setTimeout(() => fieldEl.classList.remove("copied"), 1000);
    }

    private _limitTags() {
        const tags = this.record.tags.slice(0, 2);
        const more = this.record.tags.length - tags.length;

        if (more) {
            tags.push("+" + more);
        }

        return tags;
    }
}
