import "./icon";
import { FieldType, VaultItem } from "@padloc/core/src/item";
import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";

@customElement("pl-item-icon")
export class ItemIcon extends LitElement {
    @state()
    item: VaultItem;

    @state()
    private _icon: string;

    @state()
    private _favIcon?: string;

    static styles = [
        css`
            :host {
                display: flex;
            }

            img {
                width: 1.3em;
                height: 1.3em;
            }
        `,
    ];

    //     private _loadAsDataUrl(src: string) {
    //         return new Promise<string>((resolve, reject) => {
    //             img.addEventListener(
    //                 "load",
    //                 () => {
    //                     console.log("image loaded");
    //                     canvas.width = img.width;
    //                     canvas.height = img.height;
    //                     const ctx = canvas.getContext("2d")!;
    //                     ctx.imageSmoothingQuality = "high";
    //                     ctx.drawImage(img, 0, 0);
    //                     resolve(canvas.toDataURL());
    //                 },
    //                 { once: true }
    //             );
    //             img.addEventListener("error", (e) => reject(e), { once: true });
    //             //     img.crossOrigin = "anonymous";
    //             img.src = src;
    //         });
    //     }

    async updated(changes: Map<string, unknown>) {
        if (!changes.has("item")) {
            return;
        }

        const item = this.item;
        if (!item) {
            return;
        }

        let url = item.fields.find((f) => f.type === FieldType.Url)?.value;

        if (url) {
            try {
                url = new URL(url).hostname;
            } catch (e) {}
        }

        const favIcon = url && `https://icons.duckduckgo.com/ip3/${url}.ico`;

        // const dataUrl = favIcon && (await this._loadAsDataUrl(favIcon));
        // console.log(dataUrl);

        const fieldTypes = new Set(item.fields.map((f) => f.type));

        const icon = fieldTypes.has(FieldType.Url)
            ? "web"
            : fieldTypes.has(FieldType.Credit)
            ? "credit"
            : fieldTypes.has(FieldType.Username) && fieldTypes.has(FieldType.Password)
            ? "login"
            : fieldTypes.has(FieldType.Email) && fieldTypes.has(FieldType.Password)
            ? "email"
            : fieldTypes.has(FieldType.Password)
            ? "password"
            : "note";

        this._icon = icon;
        this._favIcon = favIcon;
    }

    render() {
        return html`
            ${this._favIcon
                ? html` <img .src=${this._favIcon} @error=${() => (this._favIcon = undefined)} /> `
                : html` <pl-icon .icon=${this._icon}></pl-icon> `}
        `;
    }
}
