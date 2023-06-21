import { LitElement, html, css } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import * as monaco from "monaco-editor";
import { shared } from "../styles";

@customElement("pl-json-editor")
export class JSONEditor extends LitElement {
    static styles = [
        shared,
        css`
            :host {
                display: block;
                position: relative;
            }
        `,
    ];

    @property({ attribute: false })
    schema: any = {};

    @property()
    get value() {
        return this._editor?.getValue() || "";
    }
    set value(value: string) {
        (async () => {
            if (!this._editor) {
                await this.updateComplete;
            }
            this._editor.setValue(value);
        })();
    }

    @state()
    private _editor: ReturnType<typeof monaco.editor.create>;

    @query("#container")
    private _container: HTMLDivElement;

    private _resizeObserver = new ResizeObserver(() => this._editor?.layout());

    private _schemaUpdated() {
        const schemas = monaco.languages.json.jsonDefaults.diagnosticsOptions.schemas || [];
        const modelUri = this._editor.getModel()!.uri.toString();
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            schemas: [
                ...schemas?.filter((schema) => schema.uri === modelUri),
                {
                    uri: modelUri,
                    schema: this.schema,
                    fileMatch: [modelUri || "*"],
                },
            ],
        });
    }

    updated(changes: Map<string, unknown>) {
        if (changes.has("schema")) {
            this._schemaUpdated();
        }
    }

    firstUpdated() {
        const styles = document.querySelectorAll("style") as NodeListOf<HTMLStyleElement>;

        for (const style of styles) {
            if (style.textContent?.match(/\.monaco-|\.codicon/)) {
                this.renderRoot.appendChild(style.cloneNode(true));
            }
        }

        this._editor = monaco.editor.create(this._container, {
            language: "json",
            lineNumbers: "off",
            minimap: {
                enabled: false,
            },
            glyphMargin: false,
            lineDecorationsWidth: 0,
            folding: true,
            renderLineHighlight: "none",
        });

        this._editor.onDidChangeModelContent(() => {
            this.dispatchEvent(new CustomEvent("change", { detail: { value: this.value } }));
        });

        this._resizeObserver.observe(this._container);
    }

    render() {
        return html` <div id="container" class="fullbleed"></div> `;
    }
}
