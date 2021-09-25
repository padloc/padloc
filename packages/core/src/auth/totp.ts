import { Err, ErrorCode } from "../error";
import { generateSecret, getCounter, validateHotp } from "../otp";
import { base32ToBytes } from "../base32";
import { AuthServer, AuthType, Authenticator, AuthRequest } from "../auth";
import { Config, ConfigParam } from "../config";

export class TotpAuthConfig extends Config {
    @ConfigParam()
    interval = 30;

    @ConfigParam()
    digits = 6;

    @ConfigParam()
    hash: "SHA-1" | "SHA-256" = "SHA-1";

    @ConfigParam()
    window = 1;
}

export class TotpAuthServer implements AuthServer {
    constructor(private _config: TotpAuthConfig) {}

    supportsType(type: AuthType) {
        return type === AuthType.Totp;
    }

    async initAuthenticator(authenticator: Authenticator) {
        const secret = await generateSecret();
        authenticator.state = {
            secret,
        };
        authenticator.description = "TOTP";
        return { secret };
    }

    async activateAuthenticator(authenticator: Authenticator, { code }: { code: string }) {
        if (!(await this._verifyCode(authenticator, code))) {
            throw new Err(
                ErrorCode.AUTHENTICATION_FAILED,
                "Failed to activate authenticator. Incorrect activation code!"
            );
        }
        return {};
    }

    async initAuthRequest(_authenticator: Authenticator, _request: AuthRequest) {
        return {};
    }

    async verifyAuthRequest(authenticator: Authenticator, _request: AuthRequest, { code }: { code: string }) {
        return this._verifyCode(authenticator, code);
    }

    private async _verifyCode(authenticator: Authenticator, code: string) {
        const secret = base32ToBytes(authenticator.state.secret);
        const counter = getCounter(Date.now(), this._config);
        const lastCounter = authenticator.state.lastCounter || 0;
        if (counter <= lastCounter) {
            throw new Err(
                ErrorCode.AUTHENTICATION_FAILED,
                "Authentication request denied. Please wait for the next time window!"
            );
        }
        const verified = await validateHotp(secret, code, counter, this._config);
        authenticator.state.lastCounter = counter;
        return verified;
    }
}
