import { HashParams } from "@padloc/core/src/crypto";
import { bytesToBase64, stringToBytes } from "@padloc/core/src/encoding";
import { AuthClient, AuthType } from "@padloc/core/src/mfa";
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

export class OpenIDClient implements AuthClient {
    supportsType(type: AuthType) {
        return type === AuthType.OpenID;
    }

    async prepareRegistration({ clientId, authorizationEndpoint, redirectUri }: OpenIDParams, _clientData: undefined) {
        const crypto = getCryptoProvider();
        const state = bytesToBase64(await crypto.randomBytes(8));
        const nonce = bytesToBase64(await crypto.randomBytes(8));
        const codeVerifier = bytesToBase64(await crypto.randomBytes(16));
        const codeChallenge = bytesToBase64(
            await crypto.hash(
                stringToBytes(codeVerifier),
                new HashParams({
                    algorithm: "SHA-256",
                })
            )
        );
        console.log(codeChallenge);

        const params = new URLSearchParams();
        params.set("client_id", clientId);
        params.set("response_type", "code");
        params.set("response_mode", "fragment");
        params.set("scope", "openid email profile");
        params.set("state", state);
        params.set("nonce", nonce);
        params.set("redirect_uri", redirectUri);
        // params.set("code_challenge", codeChallenge);
        // params.set("code_challenge_method", "S256");
        // params.set("prompt", "login");

        const authUrl = `${authorizationEndpoint}?${params.toString()}`;

        let authWindow: Window | null = null;
        let messageHandler: (e: MessageEvent) => void;

        const code = await new Promise((resolve, reject) => {
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
                if (e.data?.type !== "padloc_callback") {
                    return;
                }
                try {
                    const url = new URL(e.data.url);
                    const params = url.searchParams;
                    //     const params = new URLSearchParams(url.hash.replace(/^#/, ""));
                    for (const [key, value] of params) {
                        console.log(key, ":", value);
                    }
                    const error = params.get("error");
                    const code = params.get("code");
                    const returnedState = params.get("state");
                    if (error) {
                        reject(error);
                        return;
                    }

                    if (returnedState !== state) {
                        reject("Returned state did not match.");
                        return;
                    }

                    resolve(code);
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

        return { code, codeVerifier };
    }

    async prepareAuthentication(_serverData: OpenIDParams, _clientData: undefined) {
        throw "Not implemented";
    }
}
