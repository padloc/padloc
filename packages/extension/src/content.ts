import "@webcomponents/webcomponentsjs";
import { browser } from "webextension-polyfill-ts";
// import { FieldType, FIELD_DEFS } from "@padloc/core/src/item";
import { ExtensionToolbar } from "./toolbar";
import "./toolbar";
import { Message } from "./message";

// export interface AutoFillableInput {
//     type: FieldType;
//     element: HTMLInputElement;
// }

const css = `
    @font-face {
        font-family: "Nunito";
        font-style: normal;
        font-weight: 400;
        src: url("${browser.runtime.getURL("Nunito-Regular.ttf")}") format("truetype");
    }

    @font-face {
        font-family: "Nunito";
        font-style: normal;
        font-weight: 600;
        src: url("${browser.runtime.getURL("Nunito-SemiBold.ttf")}") format("truetype");
    }

    @font-face {
        font-family: "FontAwesome";
        src: url("${browser.runtime.getURL("fontawesome-webfont.ttf")}") format("truetype");
        font-weight: normal;
        font-style: normal;
    }

    @keyframes ripple {
        from {
            opacity: 0.3;
            transform: scale(1);
        }

        to {
            opacity: 0;
            transform: scale(2);
        }
    }

    @keyframes highlight {
        from {
            opacity: 0;
            transform: scale(1.1);
        }

        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    .ripple {
        position: absolute;
        z-index: 9999999;
        border-radius: 8px;
        background: #3bb7f9;
        animation: ripple 0.8s both;
        pointer-events: none;
        will-change: transform, opacity;
    }

    .highlight {
        position: absolute;
        left: 0;
        top: 0;
        z-index: 9999999;
        border-radius: 8px;
        border: solid 2px #3bb7f9;
        box-sizing: border-box;
        pointer-events: none;
        will-change: transform, width, height, opacity;
        animation: highlight 0.3s both;
    }

    .highlight.out {
        animation-direction: reverse;
    }

    body.dragging {
        cursor: grabbing !important;
    }
`;

class ExtensionContent {
    private _toolbar?: ExtensionToolbar;

    // findAutoFillableElements() {
    //     const elements: AutoFillableInput[] = [];
    //     for (const [type, { selector }] of Object.entries(FIELD_DEFS)) {
    //         elements.push(
    //             ...Array.from(document.querySelectorAll(selector as string)).map(el => ({
    //                 type: type as FieldType,
    //                 element: el as HTMLInputElement
    //             }))
    //         );
    //     }
    //     return elements;
    // }

    async init() {
        const style = document.createElement("style");
        document.head.appendChild(style);
        style.type = "text/css";
        style.appendChild(document.createTextNode(css));

        this._toolbar = document.createElement("pl-extension-toolbar") as ExtensionToolbar;
        document.body.appendChild(this._toolbar);

        browser.runtime.onMessage.addListener((msg: Message) => this._handleMessage(msg));
    }

    private _handleMessage(msg: Message) {
        switch (msg.type) {
            case "autoFill":
                this._toolbar!.open(msg.item, msg.index);
                return Promise.resolve(true);
            case "isContentReady":
                return Promise.resolve(true);
        }
    }
}

if (typeof window.extension === "undefined") {
    window.extension = new ExtensionContent();
    window.extension.init();
}
