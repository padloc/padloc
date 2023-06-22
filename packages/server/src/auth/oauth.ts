import { Auth } from "@padloc/core/src/auth";
import { AuthRequest, AuthServer, AuthType, Authenticator } from "@padloc/core/src/auth";
import { request } from "../transport/http";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { bytesToBase64, stringToBytes } from "@padloc/core/src/encoding";
import { getCryptoProvider } from "@padloc/core/src/platform";
import { HashParams } from "@padloc/core/src/crypto";
import { OauthConfig } from "@padloc/core/src/config/auth/oauth";

export type OauthTokenInfo = {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    refresh_token_id: string;
    token_type: "Bearer";
    userId: string;
};

export type OauthUserInfo = {
    email: string;
    name?: string;
    given_name?: string;
    family_name?: string;
};

export class OauthServer implements AuthServer {
    constructor(public config: OauthConfig) {}

    supportsType(type: AuthType): boolean {
        return type === AuthType.Oauth;
    }

    async initAuthenticator(
        authenticator: Authenticator<any>,
        auth: Auth,
        { email = auth.email }: { email?: string } = {}
    ): Promise<any> {
        authenticator.state = {
            email,
            activationParams: await this._generateAuthUrl(email, authenticator.id),
        };
        return { authUrl: authenticator.state.activationParams.authUrl };
    }

    async activateAuthenticator(
        authenticator: Authenticator<any>,
        { code, state }: { code: string; state: string }
    ): Promise<any> {
        if (state !== authenticator.id) {
            throw new Err(
                ErrorCode.AUTHENTICATION_FAILED,
                "There was something wrong with this request. Please try again!"
            );
        }
        const { userInfo } = await this._getTokens({
            code,
            codeVerifier: authenticator.state.activationParams.codeVerifier,
        });
        if (userInfo.email !== authenticator.state?.email) {
            throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Email returned from authenticator does not match.");
        }
    }

    async initAuthRequest(authenticator: Authenticator<any>, request: AuthRequest<any>, _params?: any): Promise<any> {
        request.state = await this._generateAuthUrl(authenticator.state.email, request.id);
        return { authUrl: request.state.authUrl };
    }

    async verifyAuthRequest(
        authenticator: Authenticator<any>,
        request: AuthRequest<any>,
        { code, state }: { code: string; state: string }
    ): Promise<any> {
        if (state !== request.id) {
            throw new Err(
                ErrorCode.AUTHENTICATION_FAILED,
                "There was something wrong with this request. Please try again!"
            );
        }
        const res = await this._getTokens({ code, codeVerifier: request.state.codeVerifier });
        if (res.userInfo.email !== authenticator.state?.email) {
            throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Email returned from authenticator does not match.");
        }
        return { oauth: res };
    }

    private async _generateAuthUrl(email: string, state: string) {
        const { clientId, authorizationEndpoint, redirectUri } = this.config;
        const crypto = getCryptoProvider();
        const nonce = bytesToBase64(await crypto.randomBytes(8));
        const codeVerifier = bytesToBase64(await crypto.randomBytes(32));
        const codeChallenge = bytesToBase64(
            await crypto.hash(
                stringToBytes(codeVerifier),
                new HashParams({
                    algorithm: "SHA-256",
                })
            )
        );

        const params = new URLSearchParams();
        params.set("client_id", clientId);
        params.set("response_type", "code");
        params.set("response_mode", "query");
        params.set("scope", "email offline_access");
        params.set("state", state);
        params.set("nonce", nonce);
        params.set("redirect_uri", redirectUri);
        params.set("code_challenge", codeChallenge);
        params.set("code_challenge_method", "S256");
        params.set("login_hint", email);

        return {
            authUrl: `${authorizationEndpoint}?${params.toString()}`,
            state,
            nonce,
            codeVerifier,
        };
    }

    // private async _parseToken(token: string) {
    //     const [_header, payload, _signature] = token.split(".");
    //     return JSON.parse(base64ToString(payload));
    // }

    private async _getTokens({ code, codeVerifier }: { code: string; codeVerifier: string }): Promise<{
        tokens: OauthTokenInfo;
        userInfo: OauthUserInfo;
    }> {
        const body = new URLSearchParams({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            grant_type: "authorization_code",
            code,
            code_verifier: codeVerifier,
            scope: "email offline_access",
            redirect_uri: this.config.redirectUri,
        }).toString();

        try {
            const tokenRes = await request(this.config.tokenEndpoint, "POST", body, {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
                "Content-Length": body.length.toString(),
            });

            const tokens = JSON.parse(tokenRes);
            const userInfo = await request(this.config.userInfoEndpoint, "GET", undefined, {
                Accept: "application/json",
                Authorization: `Bearer ${tokens.access_token}`,
            });

            return { tokens, userInfo: JSON.parse(userInfo) };
        } catch (e) {
            throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Failed to retrieve auth token.");
        }
    }
}
