import { translate as $l } from "@padloc/locale/src/translate";
import { GetLegacyDataParams } from "@padloc/core/src/api";
import { VaultItem } from "@padloc/core/src/item";
import { mixins, shared } from "../styles";
import { BaseElement, css, query, observe } from "./base";
import { Routing } from "../mixins/routing";
import { StateMixin } from "../mixins/state";
import { animateElement, animateCascade } from "../lib/animation";
import { alert, confirm, prompt } from "../lib/dialog";
import { importLegacyContainer } from "../lib/import";
import { app } from "../globals";
import { Logo } from "./logo";
import "./icon";

export abstract class StartForm extends Routing(StateMixin(BaseElement)) {
    static styles = [
        shared,
        css`
            @keyframes reveal {
                from {
                    transform: translate(0, 30px);
                    opacity: 0;
                }
            }

            @keyframes fade {
                to {
                    transform: translate(0, -200px);
                    opacity: 0;
                }
            }

            :host {
                transition: opacity 1s;
            }

            :host(:not([active])) {
                pointer-events: none;
                opacity: 0;
            }

            :host,
            .wrapper {
                display: flex;
                flex-direction: column;
                align-items: center;
                ${mixins.fullbleed()};
                ${mixins.scroll()};
            }

            form {
                width: 100%;
                max-width: 25em;
                --input-focus-color: rgba(255, 255, 255, 0.5);
            }

            form > * {
                margin: 0.5em;
            }

            pl-logo {
                margin: 1.5em auto;
            }

            pl-button {
                overflow: hidden;
                font-weight: bold;
            }

            .hint {
                font-size: var(--font-size-small);
                box-sizing: border-box;
                padding: var(--spacing);
                transition: color 0.2s;
            }

            .hint.warning {
                color: #ffc107;
                font-weight: bold;
                margin: 0;
                padding: 0;
                text-shadow: none;
            }
        `,
    ];

    @query("pl-logo")
    protected _logo: Logo;

    protected _animateIn(nodes: Iterable<Node | Element>) {
        return animateCascade(nodes, {
            animation: "reveal",
            duration: 1000,
            fullDuration: 1500,
            initialDelay: 300,
            fill: "backwards",
            clear: 3000,
        });
    }

    protected _animateOut(nodes: Iterable<Node | Element>) {
        animateCascade(nodes, {
            animation: "fade",
            duration: 400,
            fullDuration: 600,
            initialDelay: 0,
            fill: "forwards",
            easing: "cubic-bezier(1, 0, 0.2, 1)",
            clear: 3000,
        });
    }

    @observe("active")
    protected _activeChanged() {
        this.active ? this.reset() : this.done();
    }

    reset() {
        this._animateIn(this.$$(".animated"));
        this.requestUpdate();
        this._logo && setTimeout(() => (this._logo.reveal = true), 500);
    }

    done() {
        this._animateOut(this.$$(".animated"));
    }

    rumble() {
        animateElement(this.$("form"), { animation: "rumble", duration: 200, clear: true });
    }

    protected async _migrateAccount(
        email: string,
        password: string,
        legacyToken: string,
        signupToken: string,
        name = ""
    ): Promise<boolean> {
        const choice = await alert(
            $l(
                "You don't have a Padloc 3 account yet but we've found " +
                    "an account from an older version. " +
                    "Would you like to migrate your account to Padloc 3 now?"
            ),
            {
                title: "Account Migration",
                icon: "user",
                options: [$l("Migrate"), $l("Learn More"), $l("Cancel")],
            }
        );

        if (choice === 1) {
            window.open("https://padloc.app/help/migrate-v3", "_system");
            return this._migrateAccount(email, password, legacyToken, signupToken, name);
        } else if (choice === 2) {
            return false;
        }

        const legacyData = await app.api.getLegacyData(
            new GetLegacyDataParams({
                email,
                verify: legacyToken,
            })
        );

        let items: VaultItem[] | null = null;
        try {
            if (!password) {
                throw "No password provided";
            }
            await legacyData.unlock(password);
            items = await importLegacyContainer(legacyData);
        } catch (e) {
            password = await prompt($l("Please enter your master password!"), {
                title: $l("Migrating Account"),
                placeholder: $l("Enter Master Password"),
                confirmLabel: $l("Submit"),
                type: "password",
                preventAutoClose: true,
                validate: async (password: string) => {
                    try {
                        await legacyData.unlock(password);
                        items = await importLegacyContainer(legacyData);
                    } catch (e) {
                        throw $l("Wrong password! Please try again!");
                    }
                    return password;
                },
            });
        }

        if (items && password) {
            await app.signup({ email, password, verify: signupToken, name });
            await app.addItems(items, app.mainVault!);
            const deleteLegacy = await confirm(
                $l(
                    "Your account and all associated data was migrated successfully! Do you want to delete your old account now?"
                ),
                $l("Yes"),
                $l("No"),
                { title: $l("Delete Legacy Account"), icon: "delete", preventAutoClose: true }
            );

            if (deleteLegacy) {
                await app.api.deleteLegacyAccount();
            }

            await alert(
                $l(
                    "All done! Please note that you won't be able to access your Padloc 3 account " +
                        "with older versions of the app, so please make sure you have the latest version installed " +
                        "on all your devices! (You can find download links for all platforms at " +
                        "https://padloc.app/downloads/). Enjoy using Padloc 3!"
                ),
                {
                    title: $l("Migration Complete"),
                    type: "success",
                }
            );
            return true;
        } else {
            alert($l("Unfortunately we could not complete migration of your data."), {
                type: "warning",
            });
            return false;
        }
    }
}
