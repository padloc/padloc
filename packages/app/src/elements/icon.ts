import { BaseElement, html, property } from "./base.js";

export class PlIcon extends BaseElement {
    @property({ reflect: true })
    icon: string = "";

    render() {
        return html`
        <style>
            :host {
                display: inline-block;
                text-align: center;
                font-family: "FontAwesome";
                color: inherit;
                font-size: inherit;
                position: relative;
                height: 40px;
                width: 40px;
                font-weight: normal !important;
                border-radius: 100%;
                overflow: hidden;
            }

            div {
                position: absolute;
                top: 0;
                right: 0;
                bottom: 0;
                left: 0;
                margin: auto;
                height: 0;
                line-height: 0;
            }

            :host([icon="add"]) > div::before {
                content: "\\f067";
            }

            :host([icon="menu"]) > div::before {
                content: "\\f0c9";
            }

            :host([icon="close"]) > div::before {
                content: "\\f00d";
            }

            :host([icon="more"]) > div::before {
                content: "\\f142";
            }

            :host([icon="delete"]) > div::before {
                content: "\\f2ed";
            }

            :host([icon="copy"]) > div::before {
                /* content: "\\f24d"; */
                content: "\\f0c5";
            }

            :host([icon="edit"]) > div::before {
                content: "\\f303";
            }

            :host([icon="forward"]) > div::before {
                content: "\\f054";
            }

            :host([icon="backward"]) > div::before {
                content: "\\f053";
            }

            :host([icon="check"]) > div::before {
                content: "\\f00c";
            }

            :host([icon="cancel"]) > div::before {
                content: "\\f00d";
            }

            :host([icon="generate"]) > div::before {
                content: "\\f0d0";
            }

            :host([icon="tag"]) > div::before {
                content: "\\f02b";
            }

            :host([icon="tags"]) > div::before {
                content: "\\f02c";
            }

            :host([icon="dropdown"]) > div::before {
                content: "\\f0d7";
            }

            :host([icon="dropup"]) > div::before {
                content: "\\f0d8";
            }

            :host([icon="settings"]) > div::before {
                content: "\\f013";
            }

            :host([icon="cloud"]) > div::before {
                content: "\\f0c2";
            }

            :host([icon="lock"]) > div::before {
                content: "\\f023";
            }

            :host([icon="refresh"]) > div::before {
                content: "\\f2f1";
            }

            :host([icon="unlock"]) > div::before {
                content: "\\f13e";
            }

            :host([icon="export"]) > div::before {
                content: "\\f093";
            }

            :host([icon="import"]) > div::before {
                content: "\\f019";
            }

            :host([icon="search"]) > div::before {
                content: "\\f002";
            }

            :host([icon="info"]) > div::before {
                content: "\\f129";
            }

            :host([icon="info-round"]) > div::before {
                content: "\\f05a";
            }

            :host([icon="download"]) > div::before {
                content: "\\f019";
            }

            :host([icon="upload"]) > div::before {
                content: "\\f093";
            }

            :host([icon="show"]) > div::before {
                content: "\\f06e";
            }

            :host([icon="hide"]) > div::before {
                content: "\\f070";
            }

            :host([icon="checked"]) > div::before {
                content: "\\f14a";
            }

            :host([icon="checkall"]) > div::before {
                content: "\\f560";
            }

            :host([icon="success"]) > div::before {
                content: "\\f058";
            }

            :host([icon="unchecked"]) > div::before {
                content: "\\f146";
            }

            :host([icon="share"]) > div::before {
                content: "\\f045";
            }

            :host([icon="logout"]) > div::before {
                content: "\\f2f5";
            }

            :host([icon="mail"]) > div::before {
                content: "\\f0e0";
            }

            :host([icon="user"]) > div::before {
                content: "\\f007";
            }

            :host([icon="record"]) > div::before {
                content: "\\f15b";
            }

            :host([icon="mobile"]) > div::before {
                content: "\\f10b";
                font-size: 140%;
            }

            :host([icon="database"]) > div::before {
                content: "\\f1c0";
            }

            :host([icon="time"]) > div::before {
                content: "\\f017";
            }

            :host([icon="error"]) > div::before {
                content: "\\f071";
            }

            :host([icon="question"]) > div::before {
                content: "\\f059";
            }

            :host([icon="desktop"]) > div::before {
                content: "\\f109";
                font-size: 140%;
            }

            :host([icon="group"]) > div::before {
                content: "\\f0c0";
            }

            :host([icon="vaults"]) > div::before {
                content: "\\f1b3";
            }

            :host([icon="vault"]) > div::before {
                content: "\\f1b2";
            }

            :host([icon="share"]) > div::before {
                content: "\\f064";
            }

            :host([icon="invite"]) > div::before {
                content: "\\f234";
            }

            :host([icon="trusted"]) > div::before {
                content: "\\f4fc";
            }

            :host([icon="removeuser"]) > div::before {
                content: "\\f506";
            }

            :host([icon="org"]) > div::before {
                content: "\\f1ad";
            }

            // :host([icon="logo"]) > div::before {
            //     content: "\\f447";
            // }

            :host([icon="list"]) > div::before {
                content: "\\f0ca";
            }

            :host([icon="remove"]) > div::before {
                content: "\\f056";
            }

            :host([icon="password"]) > div::before {
                content: "\\f069";
            }

            :host([icon="admins"]) > div::before {
                content: "\\f509";
            }

            :host([icon="archive"]) > div::before {
                content: "\\f187";
            }

            :host([icon="logo"]) > div::before {
                font-family: "Padlock";
                content: "\\0041";
                font-size: 110%;
            }
        </style>

        <div></div>
`;
    }
}

window.customElements.define("pl-icon", PlIcon);
