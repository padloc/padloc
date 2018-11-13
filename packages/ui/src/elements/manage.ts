import { shared } from "../styles";
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

            <style>

                :host {
                    display: flex;
                }

                pl-vault-list {
                    width: 350px;
                    border-right: solid 2px #ddd;
                }

                pl-vault-view {
                    flex: 1;
                }

            </style>

            <pl-vault-list .selected=${this.selected}></pl-vault-list>

            <pl-vault-view .selected=${this.selected}></pl-vault-view>
        `;
    }
}
