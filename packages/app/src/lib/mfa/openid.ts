import { bytesToBase64 } from "@padloc/core/src/encoding";
import { MFAClient, MFAType } from "@padloc/core/src/mfa";
import { getCryptoProvider } from "@padloc/core/src/platform";

export interface OpenIDParams {
    clientId: string;
    redirectUri: string;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    revocationEndpoint: string;
    endSessionEndpoint?: string;
    userinfoEndpoint?: string;
}

export class OpenIDClient implements MFAClient {
    supportsType(type: MFAType) {
        return type === MFAType.OpenID;
    }

    async prepareRegistration({ clientId, redirectUri, authorizationEndpoint }: OpenIDParams, _clientData: undefined) {
        const crypto = getCryptoProvider();
        const state = bytesToBase64(await crypto.randomBytes(8));
        const nonce = bytesToBase64(await crypto.randomBytes(8));

        const params = new URLSearchParams();
        params.set("client_id", clientId);
        params.set("response_type", "id_token");
        params.set("response_mode", "fragment");
        params.set("scope", "openid email profile");
        params.set("state", state);
        params.set("nonce", nonce);
        params.set("redirect_uri", redirectUri);

        const authUrl = `${authorizationEndpoint}?${params.toString()}`;

        let authWindow: Window | null = null;
        let messageHandler: (e: MessageEvent) => void;

        const token = await new Promise((resolve, reject) => {
            authWindow = window.open(
                authUrl,
                "padloc_auth_openid",
                "toolbar=0,scrollbars=1,status=1,resizable=1,location=1,menuBar=0"
            );
            if (!authWindow) {
                reject("Failed to open authentication window!");
                return;
            }

            messageHandler = (e: MessageEvent<{ type: string; url: string }>) => {
                console.log("received message", e);
                if (e.data?.type !== "padloc_callback") {
                    return;
                }
                try {
                    const url = new URL(e.data.url);
                    const params = new URLSearchParams(url.hash.replace(/^#/, ""));
                    const error = params.get("error");
                    const token = params.get("id_token");
                    const returnedState = params.get("state");
                    if (error) {
                        reject(error);
                        return;
                    }

                    if (returnedState !== state) {
                        reject("Returned state did not match.");
                        return;
                    }

                    resolve(token);
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

        return { token };
    }

    async prepareAuthentication(_serverData: OpenIDParams, _clientData: undefined) {
        throw "Not implemented";
    }
}
