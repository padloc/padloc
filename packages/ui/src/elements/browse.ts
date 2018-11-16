import { shared, listLayout } from "../styles";
import { element, property, html } from "./base.js";
import { View } from "./view.js";
import "./icon.js";
import "./browse-list.js";
import "./item-view.js";
import "./browse-filter.js";

@element("pl-browse")
export class Browse extends View {
    @property()
    selected: string = "";

    render() {
        return html`
            ${shared}
            ${listLayout}

            <div class="list-layout" ?show-detail=${!!this.selected}>

                <pl-browse-list .selected=${this.selected}></pl-browse-list>

                <pl-item-view .selected=${this.selected}></pl-item-view>

            </div>
        `;
    }
}
