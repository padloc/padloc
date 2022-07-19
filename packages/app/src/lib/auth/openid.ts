import { AuthClient, AuthType } from "@padloc/core/src/auth";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { openPopup } from "../util";

export class OpenIDClient implements AuthClient {
    supportsType(type: AuthType) {
        return type === AuthType.OpenID;
    }

    private async _getAuthorizationCode({ authUrl, authWindow }: { authUrl: string; authWindow?: Window | null }) {
        // let authWindow: Window | null = null;
        let messageHandler: (e: MessageEvent) => void;
        let checkWindowClosedInterval: number;

        return new Promise<any>((resolve, reject) => {
            if (authWindow) {
                authWindow.location = authUrl;
                authWindow.focus();
            } else {
                authWindow = openPopup(authUrl, {
                    name: "padloc_auth_openid",
                });
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
                    //     const params = new URLSearchParams(url.hash.replace(/^#/, ""));
                    const error = params.get("error");
                    const code = params.get("code");
                    const state = params.get("state");

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

    async prepareAuthentication(params: { authUrl: string }) {
        return this._getAuthorizationCode(params);
    }
}
