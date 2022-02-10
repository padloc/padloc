import { AsBytes, AsSerializable, Serializable } from "./encoding";
import { CompleteCreateSessionParams, Handler, StartAuthRequestParams, StartCreateSessionParams } from "./api";
import { AccountStatus, AuthPurpose, AuthRequest, AuthRequestStatus, AuthType } from "./auth";
import { PBKDF2Params } from "./crypto";
import { AccountID } from "./account";
import { Session } from "./session";
import { Err, ErrorCode } from "./error";
import { Controller } from "./server";

/**
 * @deprecated
 */
enum V3AuthPurpose {
    Signup,
    Login,
    Recover,
    GetLegacyData,
}

/**
 * @deprecated
 */
export function mapLegacyAuthPurpose(purpose: V3AuthPurpose) {
    return (
        {
            0: AuthPurpose.Signup,
            1: AuthPurpose.Login,
            2: AuthPurpose.Recover,
            3: AuthPurpose.GetLegacyData,
        }[purpose] || AuthPurpose.Login
    );
}

/**
 * Parameters for requesting Multi-Factor Authenticatino via [[API.requestMFACode]]
 * @deprecated
 */
export class RequestMFACodeParams extends Serializable {
    /** The accounts email address */
    email = "";

    /** The purpose of the email verification */
    purpose: V3AuthPurpose = V3AuthPurpose.Login;

    type: AuthType = AuthType.Email;

    constructor(props?: Partial<RequestMFACodeParams>) {
        super();
        props && Object.assign(this, props);
    }
}

/**
 * Parameters for retrieving MFA token via [[API.retrieveMFAToken]]
 * @deprecated since v4.0. Please use [[CompleteMFARequestParams]].
 */
export class RetrieveMFATokenParams extends Serializable {
    /** The email address to be verified */
    email: string = "";

    /**
     * The verification code received via email after calling [[API.requestEmailVerification]]
     */
    code: string = "";

    /** Parameters need to verify authentication request */
    params: any;

    purpose: V3AuthPurpose = V3AuthPurpose.Login;

    constructor(props?: Partial<RetrieveMFATokenParams>) {
        super();
        props && Object.assign(this, props);
    }
}

/**
 * @deprecated since v4.0. Please use [[CompleteMFARequestResponse]].
 */
export class RetrieveMFATokenResponse extends Serializable {
    /** The verification token which can be used to authenticate certain requests */
    token: string = "";

    /** Whether the user already has an account */
    hasAccount: boolean = false;

    /** Whether the user has a legacy account */
    hasLegacyAccount: boolean = false;

    /** Token for getting legacy data. */
    legacyToken?: string = undefined;

    constructor(props?: Partial<RetrieveMFATokenResponse>) {
        super();
        props && Object.assign(this, props);
    }
}

/**
 * Parameters for initiating authentication through [[API.initAuth]]
 * @deprecated
 */
export class InitAuthParams extends Serializable {
    /** The email address of the [[Account]] in question */
    email = "";

    /**
     * The verification token obtained from [[API.completeEmailVerification]].
     */
    verify?: string = undefined;

    constructor(props?: Partial<InitAuthParams>) {
        super();
        props && Object.assign(this, props);
    }
}

/**
 * The response object received from [[API.initAuth]]
 * @deprecated
 */
export class InitAuthResponse extends Serializable {
    /** The account id */
    account: AccountID = "";

    /** The key derivation parameters used for authentication */
    @AsSerializable(PBKDF2Params)
    keyParams: PBKDF2Params = new PBKDF2Params();

    /** A random value used for SRP session negotiation */
    @AsBytes()
    B!: Uint8Array;

    constructor(props?: Partial<InitAuthResponse>) {
        super();
        props && Object.assign(this, props);
    }
}

/**
 * Parameters for creating a new [[Session]] through [[API.createSession]]
 */
export class CreateSessionParams extends Serializable {
    /** The id of the [[Account]] to create the session for */
    account: AccountID = "";

    /** Verification value used for SRP session negotiation */
    @AsBytes()
    M!: Uint8Array;

    /** Random value used form SRP session negotiation */
    @AsBytes()
    A!: Uint8Array;

    constructor(props?: Partial<CreateSessionParams>) {
        super();
        props && Object.assign(this, props);
    }
}

const srpIds = new Map<AccountID, string>();

type Constructor<T> = new (...args: any[]) => T;

/**
 * V3 Compatibility Layer, implemented as a mixin
 */
export const V3Compat = (base: Constructor<Controller>) => {
    class C extends base {
        /**
         * Request verification of a given email address. This will send a verification code
         * to the email in question which can then be exchanged for a verification token via
         * [[completeEmailVerification]].
         * @deprecated since v4.0. Please use [[startAuthRequest]] instead
         */
        @Handler(RequestMFACodeParams, undefined)
        async requestMFACode({ email, purpose }: RequestMFACodeParams) {
            await this.startAuthRequest(
                new StartAuthRequestParams({ email, purpose: mapLegacyAuthPurpose(purpose), type: AuthType.Email })
            );
        }

        /**
         * Complete the email verification process by providing a verification code received
         * via email. Returns a verification token that can be used in other api calls like
         * [[createAccount]] or [[recoverAccount]].
         * @deprecated since v4.0. Please use [[completeAuthRequest]] instead
         */
        @Handler(RetrieveMFATokenParams, RetrieveMFATokenResponse)
        async retrieveMFAToken({ email, code, purpose: legacyPurpose }: RetrieveMFATokenParams) {
            const purpose = mapLegacyAuthPurpose(legacyPurpose);
            try {
                const auth = await this._getAuth(email);

                const request = auth.authRequests.find(
                    (m) =>
                        m.type === AuthType.Email &&
                        m.purpose === purpose &&
                        m.state.email === email &&
                        m.state.verificationCode === code
                );
                if (!request) {
                    throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Failed to complete auth request.");
                }

                if (request.tries >= 3) {
                    throw new Err(
                        ErrorCode.AUTHENTICATION_TRIES_EXCEEDED,
                        "You have exceed your allowed numer of tries!"
                    );
                }

                const authenticators = await this._getAuthenticators(auth);

                const authenticator = authenticators.find((m) => m.id === request.authenticatorId);
                if (!authenticator) {
                    throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Failed to complete auth request.");
                }

                if (request.type !== authenticator.type) {
                    throw new Err(
                        ErrorCode.AUTHENTICATION_FAILED,
                        "The auth request type and authenticator type do not match!"
                    );
                }

                const provider = this._getAuthServer(request.type);

                try {
                    await provider.verifyAuthRequest(authenticator, request, { code });
                    request.status = AuthRequestStatus.Verified;
                    request.verified = new Date();
                    authenticator.lastUsed = new Date();
                    await this.storage.save(auth);
                } catch (e) {
                    request.tries++;
                    await this.storage.save(auth);
                    throw e;
                }

                const hasAccount = auth.accountStatus === AccountStatus.Active;

                const hasLegacyAccount = !!this.legacyServer && !!(await this.legacyServer.getStore(email));

                // If the user doesn't have an account but does have a legacy account,
                // repurpose the verification token for signup
                if (!hasAccount && hasLegacyAccount) {
                    request.purpose = AuthPurpose.Signup;
                }

                let legacyToken: string | undefined = undefined;
                if (hasLegacyAccount) {
                    const getLegacyDataMFARequest = new AuthRequest({
                        type: AuthType.Email,
                        purpose: AuthPurpose.GetLegacyData,
                    });
                    await getLegacyDataMFARequest.init();
                    getLegacyDataMFARequest.verified = new Date();
                    getLegacyDataMFARequest.status = AuthRequestStatus.Verified;
                    legacyToken = getLegacyDataMFARequest.token;
                    auth.authRequests.push(getLegacyDataMFARequest);
                }

                await this.storage.save(auth);

                return new RetrieveMFATokenResponse({
                    token: request.token,
                    hasAccount,
                    hasLegacyAccount,
                    legacyToken,
                });
            } catch (e) {
                throw e;
            }
        }

        /**
         * Initiate the login procedure for a given account by requesting the authentication params
         * which are required for proceeding with [[createSession]].
         * @deprecated
         */
        @Handler(InitAuthParams, InitAuthResponse)
        async initAuth({ email, verify }: InitAuthParams): Promise<InitAuthResponse> {
            const { accountId, srpId, keyParams, B } = await this.startCreateSession(
                new StartCreateSessionParams({ email, authToken: verify })
            );
            srpIds.set(accountId, srpId);
            return new InitAuthResponse({ account: accountId, keyParams, B });
        }

        /**
         * Create new [[Session]] which can be used to authenticate future request
         * @deprecated
         */
        @Handler(CreateSessionParams, Session)
        createSession({ account, M, A }: CreateSessionParams): Promise<Session> {
            const srpId = srpIds.get(account);
            return this.completeCreateSession(
                new CompleteCreateSessionParams({
                    srpId,
                    accountId: account,
                    M,
                    A,
                })
            );
        }

        /**
         * @deprecated
         */
        @Handler(undefined, undefined)
        async getBillingProviders(): Promise<never[]> {
            return [];
        }
    }
    return C;
};
