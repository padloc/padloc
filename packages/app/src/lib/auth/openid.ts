import { AuthClient, AuthType } from "@padloc/core/src/auth";

export class OpenIDClient implements AuthClient {
    supportsType(type: AuthType) {
        return type === AuthType.OpenID;
    }

    private async _getAuthorizationCode({ authUrl }: { authUrl: string }) {
        let authWindow: Window | null = null;
        let messageHandler: (e: MessageEvent) => void;

        return new Promise<any>((resolve, reject) => {
            authWindow = window.open(
                authUrl,
                "padloc_auth_openid",
                "toolbar=0,scrollbars=1,status=1,resizable=1,location=1,menuBar=0,width=500,height=800"
            );
            if (!authWindow) {
                reject("Failed to open authentication window!");
                return;
            }

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
            authWindow?.close();
            window.removeEventListener("message", messageHandler);
        });
    }

    async prepareRegistration(params: { authUrl: string }) {
        return this._getAuthorizationCode(params);
    }

    async prepareAuthentication(params: { authUrl: string }) {
        return this._getAuthorizationCode(params);
    }
}
