import { ItemTemplate, ITEM_TEMPLATES } from "@padloc/core/src/item";
import { translate as $l } from "@padloc/locale/src/translate";
import { element, html, css } from "./base";
import { Dialog } from "./dialog";

@element("pl-template-dialog")
export class TemplateDialog extends Dialog<void, ItemTemplate> {
    static styles = [
        ...Dialog.styles,
        css`
            .inner {
                background: var(--color-quaternary);
                max-width: 440px;
            }

            .templates {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                grid-gap: 8px;
                margin: 8px;
            }

            .template {
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
                <div class="title flex">${$l("Choose A Template")}</div>
                <pl-icon icon="cancel" class="tap" @click=${this.dismiss}></pl-icon>
            </header>

            <div class="content">
                <div class="message">
                    ${$l("What kind of item you would like to add?")}
                </div>
                <div class="templates">
                    ${ITEM_TEMPLATES.map(
                        template => html`
                            <div class="item template tap" @click=${() => this.done(template)}>
                                <pl-icon icon=${template.icon} class="icon"></pl-icon>
                                <div>${template.toString()}</div>
                            </div>
                        `
                    )}
                </div>
            </div>
        `;
    }
}
