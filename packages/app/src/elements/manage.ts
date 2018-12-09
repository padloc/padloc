import { shared, listLayout } from "../styles";
import { View } from "./view.js";
import { element, property, html } from "./base.js";
import "./vault-list.js";
import "./vault-view.js";

@element("pl-manage")
export class Manage extends View {
    @property()
    selected: string = "";

    render() {
        return html`

            ${shared}
            ${listLayout}

            <div class="list-layout" ?show-detail=${!!this.selected}>

                <pl-vault-list .selected=${this.selected}></pl-vault-list>

                <pl-vault-view .selected=${this.selected}></pl-vault-view>

            </div>
        `;
    }
}
