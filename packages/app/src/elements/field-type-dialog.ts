import { FieldType, FIELD_DEFS } from "@padloc/core/src/item";
import { translate as $l } from "@padloc/locale/src/translate";
import { element, html, css } from "./base";
import { Dialog } from "./dialog";

@element("pl-field-type-dialog")
export class FieldTypeDialog extends Dialog<void, FieldType> {
    static styles = [
        ...Dialog.styles,
        css`
            .inner {
                background: var(--color-quaternary);
                max-width: 440px;
            }

            .field-defs {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                grid-gap: 8px;
                margin: 8px;
            }

            .field-def {
                padding: 8px;
                display: flex;
                align-items: center;
                margin: 0;
                font-weight: 600;
            }

            .icon {
                margin-right: 4px;
            }

            .message {
                text-align: center;
                margin: 20px;
            }
        `
    ];

    renderContent() {
        return html`
            <header>
                <pl-icon></pl-icon>
                <div class="title flex">${$l("Choose A Field Type")}</div>
                <pl-icon icon="cancel" class="tap" @click=${this.dismiss}></pl-icon>
            </header>

            <div class="content">
                <div class="message">
                    ${$l("What kind of field you would like to add?")}
                </div>
                <div class="field-defs">
                    ${[...Object.values(FIELD_DEFS)].map(
                        fieldDef => html`
                            <div class="item field-def tap" @click=${() => this.done(fieldDef.type)}>
                                <pl-icon icon=${fieldDef.icon} class="icon"></pl-icon>
                                <div>${fieldDef.name}</div>
                            </div>
                        `
                    )}
                </div>
            </div>
        `;
    }
}
