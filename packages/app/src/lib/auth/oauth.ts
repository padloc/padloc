import { AuthClient, AuthType } from "@padloc/core/src/auth";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { wait } from "@padloc/core/src/util";
import { $l } from "@padloc/locale/src/translate";
import { html } from "lit";
import { alert } from "../dialog";
import { openPopup } from "../util";

export class OauthClient implements AuthClient {
    supportsType(type: AuthType) {
        return type === AuthType.Oauth;
    }

    private async _getAuthorizationCode({ authUrl, authWindow }: { authUrl: string; authWindow?: Window | null }) {
        // let authWindow: Window | null = null;
        let messageHandler: (e: MessageEvent) => void;
        let checkWindowClosedInterval: number;

        return new Promise<any>(async (resolve, reject) => {
            if (authWindow) {
                authWindow.location = authUrl;
                authWindow.focus();
            } else {
                authWindow = openPopup(authUrl, {
                    name: "padloc_auth_openid",
                });
                const url = new URL(authUrl);
                // If the window is still `null`, it may be because the browser requires windows
                // to be opened directly from a click handler (looking at you, Safari...).
                if (!authWindow) {
                    await alert(html`Redirecting you to <span class="mono">${url.origin}</span>...`, {
                        options: [
                            html`<div class="spacing horizontal layout">
                                <div>${$l("Continue")}</div>
                                <pl-icon icon="arrow-right"></pl-icon>
                            </div>`,
                        ],
                        icon: "share",
                        doneHandler: () => {
                            authWindow = openPopup(authUrl, {
                                name: "padloc_auth_openid",
                            });
                        },
                    });
                }
            }

            if (!authWindow) {
                reject(new Err(ErrorCode.AUTHENTICATION_FAILED, "Failed to open authentication window!"));
                return;
            }

            checkWindowClosedInterval = window.setInterval(() => {
                if (authWindow?.closed) {
                    reject(new Err(ErrorCode.AUTHENTICATION_FAILED, "The authentication process was canceled."));
                }
            }, 1000);

            messageHandler = (e: MessageEvent<{ type: string; url: string }>) => {
                if (e.data?.type !== "padloc_oauth_redirect") {
                    return;
                }
                try {
                    const url = new URL(e.data.url);
                    const params = url.searchParams;
                    const error = params.get("error");
                    const code = params.get("code");
                    const state = params.get("state");

                    console.log("message received", url);

                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve({ code, state });
                    return;
                } catch (e) {
                    reject(e);
                }
            };

            window.addEventListener("message", messageHandler);
        }).finally(() => {
            window.clearInterval(checkWindowClosedInterval);
            authWindow?.close();
            window.removeEventListener("message", messageHandler);
        });
    }

    async getInitialAuthData() {
        return {
            client: {
                authWindow: window.open(
                    "",
                    "padloc_auth_openid",
                    "toolbar=0,scrollbars=1,status=1,resizable=1,location=1,menuBar=0,width=500,height=800"
                ),
            },
        };
    }

    async prepareRegistration(params: { authUrl: string }) {
        return this._getAuthorizationCode(params);
    }

    async prepareAuthentication({ authUrl }: { authUrl: string }) {
        // return this._getAuthorizationCode(params);
        await wait(500);
        window.location.href = authUrl;
        return new Promise<{ authUrl: string }>(() => {});
    }
}
