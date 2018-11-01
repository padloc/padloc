import { localize as $l } from "@padlock/core/lib/locale.js";
import { shared, mixins } from "../styles";
import { router } from "../init";
import { View } from "./view.js";
import { element, html } from "./base.js";

@element("pl-manage")
export class Manage extends View {
    render() {
        return html`

            ${shared}

            <style>

                :host {
                    display: flex;
                    flex-direction: column;
                    ${mixins.fullbleed()}
                }

                .vault {
                    ${mixins.card()}
                    margin: 8px;
                }

                .vault-main {
                    font-size: 140%;
                    padding: 8px
                }

                .vault-sub {
                    padding: 0 8px 0 20px;;
                }
            </style>

            <header>

                <pl-icon icon="close" class="tap" @click=${() => router.go("")}></pl-icon>

                <div class="title">${$l("Vaults")}</div>

                <pl-icon icon=""></pl-icon>

            </header>

            <main>

                <section class="vault">

                    <div class="vault-main layout horizontal align-center">

                        <pl-icon icon="user"></pl-icon>

                        <div class="flex">MaKleSoft</div>

                        <div class="tags">

                            <div class="tag">

                                <pl-icon icon="group"></pl-icon>

                                <div>10</div>

                            </div>

                            <div class="tag">

                                <pl-icon icon="record"></pl-icon>

                                <div>100</div>

                            </div>
                
                        </div>
                
                    </div>

                    <div class="vault-sub layout horizontal align-center">

                        <div class="flex">Marketing</div>

                        <div class="tags small">

                            <div class="tag">

                                <pl-icon icon="group"></pl-icon>

                                <div>10</div>

                            </div>

                            <div class="tag">

                                <pl-icon icon="record"></pl-icon>

                                <div>100</div>

                            </div>
                
                        </div>
                
                    </div>

                    <div class="vault-sub layout horizontal align-center">

                        <div class="flex">Development</div>

                        <div class="tags small">

                            <div class="tag">

                                <pl-icon icon="group"></pl-icon>

                                <div>10</div>

                            </div>

                            <div class="tag">

                                <pl-icon icon="record"></pl-icon>

                                <div>100</div>

                            </div>
                
                        </div>

                    </div>

                </section>

            </main>

            <div class="rounded-corners"></div>
        `;
    }
}
