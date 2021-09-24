import { Account } from "@padloc/core/src/account";
import { Auth } from "@padloc/core/src/auth";
import { Config, ConfigParam } from "@padloc/core/src/config";
import { AuthRequest, AuthServer, AuthType, Authenticator } from "@padloc/core/src/mfa";
import { request } from "../transport/http";
import { Err, ErrorCode } from "@padloc/core/src/error";
import { base64ToString } from "@padloc/core/src/encoding";

export class OpenIdConfig extends Config {
    @ConfigParam()
    clientId!: string;

    @ConfigParam("string", true)
    clientSecret!: string;

    @ConfigParam()
    authorizationEndpoint!: string;

    @ConfigParam()
    tokenEndpoint!: string;

    @ConfigParam()
    redirectUri!: string;
}

export class OpenIDServer implements AuthServer {
    constructor(public config: OpenIdConfig) {}

    supportsType(type: AuthType): boolean {
        return type === AuthType.OpenID;
    }

    async initAuthenticator(
        authenticator: Authenticator<any>,
        _account: Account,
        auth: Auth,
        data: { email: string }
    ): Promise<any> {
        authenticator.state = { email: data.email || auth.email };
        const { clientId, authorizationEndpoint, redirectUri } = this.config;
        return { clientId, authorizationEndpoint, redirectUri, loginHint: authenticator.state.email };
    }

    async activateAuthenticator(
        authenticator: Authenticator<any>,
        data: { code: string; codeVerifier: string }
    ): Promise<any> {
        const token = await this._getToken(data);
        if (token.email !== authenticator.state?.email) {
            throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Email returned from authenticator does not match.");
        }
        authenticator.state.id_token = token;
    }

    async initAuthRequest(authenticator: Authenticator<any>, _request: AuthRequest<any>, _params?: any): Promise<any> {
        const { clientId, authorizationEndpoint, redirectUri } = this.config;
        return { clientId, authorizationEndpoint, redirectUri, loginHint: authenticator.state.email };
    }

    async verifyAuthRequest(
        authenticator: Authenticator<any>,
        _request: AuthRequest<any>,
        data: { code: string; codeVerifier: string }
    ): Promise<boolean> {
        try {
            const token = await this._getToken(data);
            if (token.email !== authenticator.state?.email) {
                throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Email returned from authenticator does not match.");
            }
            authenticator.state.id_token = token;
            return true;
        } catch (e) {
            return false;
        }
    }

    private async _parseToken(token: string) {
        const [_header, payload, _signature] = token.split(".");
        return JSON.parse(base64ToString(payload));
    }

    private async _getToken({ code, codeVerifier }: { code: string; codeVerifier: string }) {
        const body = new URLSearchParams({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            grant_type: "authorization_code",
            code,
            code_verifier: codeVerifier,
            scope: "openid profile email",
            redirect_uri: this.config.redirectUri,
        }).toString();

        console.log(this.config.tokenEndpoint, body);

        try {
            const tokenRes = await request(this.config.tokenEndpoint, "POST", body, {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
                "Content-Length": body.length.toString(),
            });

            const { id_token } = JSON.parse(tokenRes);

            if (!id_token) {
                throw new Err(ErrorCode.AUTHENTICATION_FAILED, "No id token was returned.");
            }

            try {
                return this._parseToken(id_token);
            } catch (e) {
                throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Failed to parse ID token.");
            }
        } catch (e) {
            console.error(e);
        }
    }
}
