import { shared, listLayout } from "../styles";
import { View } from "./view.js";
import { element, property, html } from "./base.js";
import "./org-list.js";
import "./org-view.js";

@element("pl-manage")
export class Manage extends View {
    @property()
    selected: string = "";

    render() {
        return html`
            ${shared} ${listLayout}

            <div class="list-layout" ?show-detail=${!!this.selected}>
                <pl-org-list .selected=${this.selected}></pl-org-list>
                <pl-org-view .selected=${this.selected}></pl-org-view>
            </div>
        `;
    }
}
