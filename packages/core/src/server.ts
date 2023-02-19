import { Serializable, stringToBase64, bytesToBase64 } from "./encoding";
import {
    API,
    StartCreateSessionParams,
    StartCreateSessionResponse,
    CreateAccountParams,
    RecoverAccountParams,
    CompleteCreateSessionParams,
    GetInviteParams,
    GetAttachmentParams,
    DeleteAttachmentParams,
    GetLegacyDataParams,
    StartRegisterAuthenticatorParams,
    StartRegisterAuthenticatorResponse,
    CompleteRegisterMFAuthenticatorParams,
    CompleteRegisterMFAuthenticatorResponse,
    StartAuthRequestResponse,
    CompleteAuthRequestResponse,
    CompleteAuthRequestParams,
    StartAuthRequestParams,
    CreateKeyStoreEntryParams,
    GetKeyStoreEntryParams,
    AuthInfo,
    UpdateAuthParams,
    ListParams,
    ListResponse,
    ChangeEmailParams,
} from "./api";
import { Storage } from "./storage";
import { Attachment, AttachmentStorage } from "./attachment";
import { Session, SessionID } from "./session";
import { Account, AccountID } from "./account";
import { Auth, AccountStatus } from "./auth";
import {
    AuthRequest,
    AuthPurpose,
    Authenticator,
    AuthServer,
    AuthType,
    AuthenticatorStatus,
    AuthRequestStatus,
} from "./auth";
import { Request, Response } from "./transport";
import { Err, ErrorCode } from "./error";
import { Vault, VaultID } from "./vault";
import { Org, OrgID, OrgMember, OrgMemberStatus, OrgRole, ScimSettings } from "./org";
import { Invite } from "./invite";
import {
    ConfirmMembershipInviteMessage,
    PlainMessage,
    JoinOrgInviteAcceptedMessage,
    JoinOrgInviteCompletedMessage,
    JoinOrgInviteMessage,
    FailedLoginAttemptMessage,
    NewLoginMessage,
    Messenger,
} from "./messenger";
import { Server as SRPServer, SRPSession } from "./srp";
import { DeviceInfo, getCryptoProvider } from "./platform";
import { getIdFromEmail, uuid, removeTrailingSlash } from "./util";
import { loadLanguage, translate as $l } from "@padloc/locale/src/translate";
import { ChangeLogEntry, ChangeLogger, Logger, RequestLogEntry, RequestLogger, VoidLogger } from "./logging";
import { PBES2Container } from "./container";
import { KeyStoreEntry } from "./key-store";
import { Config, ConfigParam } from "./config";
import { Provisioner, Provisioning, ProvisioningStatus, StubProvisioner } from "./provisioning";
import { V3Compat } from "./v3-compat";

/** Server configuration */
export class ServerConfig extends Config {
    /** URL where the client interface is hosted. Used for creating links into the application */
    @ConfigParam()
    clientUrl = "http://localhost:8080";

    /** Email address to report critical errors to */
    @ConfigParam()
    reportErrors = "";

    /** Maximum accepted request age */
    @ConfigParam("number")
    maxRequestAge = 60 * 60 * 1000;

    /** Whether or not to require email verification before creating an account */
    @ConfigParam("boolean")
    verifyEmailOnSignup = true;

    @ConfigParam("string[]")
    defaultAuthTypes: AuthType[] = [AuthType.Email];

    /** URL where the SCIM directory server is hosted, if used. Used for creating URLs for integrations */
    @ConfigParam()
    scimServerUrl = "http://localhost:5000";

    @ConfigParam("string[]")
    admins: string[] = [];

    constructor(init: Partial<ServerConfig> = {}) {
        super();
        Object.assign(this, init);
    }
}

/**
 * Request context
 */
export interface Context {
    id: string;

    /** Current [[Session]] */
    session?: Session;

    /** [[Account]] associated with current session */
    account?: Account;

    /** [[Auth]] associated with current session */
    auth?: Auth;

    /** [[Auth]] associated with current session */
    provisioning?: Provisioning;

    /** Information about the device the request is coming from */
    device?: DeviceInfo;

    location?: {
        city?: string;
        country?: string;
    };
}

export interface LegacyServer {
    getStore(email: string): Promise<PBES2Container | null>;
    deleteAccount(email: string): Promise<void>;
}

/**
 * Controller class for processing api requests
 */
export class Controller extends API {
    public context: Context;
    public logger: Logger;
    public storage: Storage;
    public changeLogger?: ChangeLogger;
    public requestLogger?: RequestLogger;

    constructor(public server: Server, context: Context) {
        super();
        this.context = context;
        this.logger = server.logger.withContext(context);
        this.changeLogger = server.changeLogger;
        this.requestLogger = server.requestLogger;
        this.storage = this.changeLogger ? this.changeLogger.wrap(server.storage, context) : server.storage;
    }

    get config() {
        return this.server.config;
    }

    get messenger() {
        return this.server.messenger;
    }

    get attachmentStorage() {
        return this.server.attachmentStorage;
    }

    get legacyServer() {
        return this.server.legacyServer;
    }

    get authServers() {
        return this.server.authServers;
    }

    get provisioner() {
        return this.server.provisioner;
    }

    async authenticate(req: Request, ctx: Context) {
        if (!req.auth) {
            return;
        }

        let session: Session;

        // Find the session with the id specified in the [[Request.auth]] property
        try {
            session = await this.storage.get(Session, req.auth.session);
        } catch (e) {
            if (e.code === ErrorCode.NOT_FOUND) {
                throw new Err(ErrorCode.INVALID_SESSION);
            } else {
                throw e;
            }
        }

        // Reject expired sessions
        if (session.expires && session.expires < new Date()) {
            throw new Err(ErrorCode.SESSION_EXPIRED);
        }

        // Verify request signature
        if (!(await session.verify(req))) {
            throw new Err(ErrorCode.INVALID_REQUEST, "Failed to verify request signature!");
        }

        // Reject requests/responses older than a certain age to mitigate replay attacks
        const age = Date.now() - new Date(req.auth.time).getTime();
        if (age > this.config.maxRequestAge) {
            throw new Err(
                ErrorCode.MAX_REQUEST_AGE_EXCEEDED,
                "The request was rejected because it's timestamp is too far in the past. " +
                    "Please make sure your local clock is set to the correct time and try again!"
            );
        }

        // Get account associated with this session
        const account = await this.storage.get(Account, session.account);
        const auth = await this._getAuth(account.email);

        // Store account and session on context
        ctx.session = session;
        ctx.account = account;
        ctx.auth = auth;
        ctx.location = req.location;

        // Update session info
        session.lastUsed = new Date();
        session.device = ctx.device;
        session.lastLocation = req.location;
        session.updated = new Date();

        const i = auth.sessions.findIndex(({ id }) => id === session.id);
        if (i !== -1) {
            auth.sessions[i] = session.info;
        } else {
            auth.sessions.push(session.info);
        }

        ctx.provisioning = await this.provisioner.getProvisioning(auth, session);

        await Promise.all([this.storage.save(session), this.storage.save(auth)]);
    }

    async process(req: Request) {
        const def = this.handlerDefinitions.find((def) => def.method === req.method);

        if (!def) {
            throw new Err(ErrorCode.INVALID_REQUEST);
        }

        const clientVersion = (req.device && req.device.appVersion) || undefined;

        const param = req.params && req.params[0];

        const input = def.input && param ? new def.input().fromRaw(param) : param;

        const result = await this[def.method](input);

        const toRaw = (obj: any) => (obj instanceof Serializable ? obj.toRaw(clientVersion) : obj);

        return Array.isArray(result) ? result.map(toRaw) : toRaw(result);
    }

    log(type: string, data: any = {}) {
        return this.logger.log(type, data);
    }

    async startRegisterAuthenticator({ type, purposes, data, device }: StartRegisterAuthenticatorParams) {
        const { auth } = this._requireAuth();
        const authenticator = new Authenticator({ type, purposes, device });
        await authenticator.init();
        const provider = this._getAuthServer(type);
        const responseData = await provider.initAuthenticator(authenticator, auth, data);
        auth.authenticators.push(authenticator);
        await this.storage.save(auth);
        return new StartRegisterAuthenticatorResponse({
            id: authenticator.id,
            data: responseData,
            type,
        });
    }

    async completeRegisterAuthenticator({ id, data }: CompleteRegisterMFAuthenticatorParams) {
        const { auth } = this._requireAuth();
        const authenticator = auth.authenticators.find((m) => m.id === id);
        if (!authenticator) {
            throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Failed to complete authenticator registration.");
        }
        const provider = this._getAuthServer(authenticator.type);
        const responseData = await provider.activateAuthenticator(authenticator, data);
        authenticator.status = AuthenticatorStatus.Active;
        await this.storage.save(auth);

        this.log("account.registerAuthenticator", {
            authenticator: {
                id: authenticator.id,
                type: authenticator.type,
                description: authenticator.description,
                purposes: authenticator.purposes,
            },
        });

        return new CompleteRegisterMFAuthenticatorResponse({ id: authenticator.id, data: responseData });
    }

    async deleteAuthenticator(id: string) {
        const { auth } = this._requireAuth();
        // if (auth.authenticators.length <= 1) {
        //     throw new Err(
        //         ErrorCode.BAD_REQUEST,
        //         "Cannot delete multi-factor authenticator. At least one authenticator is required."
        //     );
        // }
        const index = auth.authenticators.findIndex((a) => a.id === id);
        const authenticator = auth.authenticators[index];
        if (index < 0) {
            throw new Err(ErrorCode.NOT_FOUND, "An authenticator with this ID does not exist!");
        }
        auth.authenticators.splice(index, 1);
        await this.storage.save(auth);

        this.log("account.deleteAuthenticator", {
            authenticator: {
                id: authenticator.id,
                type: authenticator.type,
                description: authenticator.description,
                purposes: authenticator.purposes,
            },
        });
    }

    async startAuthRequest({
        email,
        authenticatorId,
        authenticatorIndex,
        type,
        supportedTypes,
        purpose,
        data,
    }: StartAuthRequestParams): Promise<StartAuthRequestResponse> {
        const auth = (this.context.auth = await this._getAuth(email));
        const provisioning = (this.context.provisioning = await this.provisioner.getProvisioning(auth));

        const authenticators = await this._getAuthenticators(auth);

        const availableAuthenticators = authenticators.filter(
            (m) =>
                (typeof authenticatorId === "undefined" || m.id === authenticatorId) &&
                (typeof type === "undefined" || m.type === type) &&
                (typeof supportedTypes === "undefined" || supportedTypes.includes(m.type)) &&
                (purpose === AuthPurpose.TestAuthenticator || m.purposes.includes(purpose)) &&
                m.status === AuthenticatorStatus.Active
        );

        const authenticator = availableAuthenticators[authenticatorIndex || 0];
        if (!authenticator) {
            throw new Err(ErrorCode.NOT_FOUND, "No appropriate authenticator found!");
        }

        const provider = this._getAuthServer(authenticator.type);
        const request = new AuthRequest({
            authenticatorId: authenticator.id,
            type: authenticator.type,
            purpose:
                purpose === AuthPurpose.Login && auth.accountStatus !== AccountStatus.Active
                    ? AuthPurpose.Signup
                    : purpose,
            device: this.context.device,
        });
        await request.init();

        auth.authRequests.push(request);

        const deviceTrusted =
            auth.disableMFA ||
            (this.context.device && auth.trustedDevices.some(({ id }) => id === this.context.device!.id));

        const response = new StartAuthRequestResponse({
            id: request.id,
            email,
            token: request.token,
            type: request.type,
            purpose: request.purpose,
            authenticatorId: authenticator.id,
            requestStatus: request.status,
            deviceTrusted,
        });

        if (
            request.purpose === AuthPurpose.Login &&
            deviceTrusted &&
            provisioning.account.status === ProvisioningStatus.Active
        ) {
            request.verified = new Date();
            response.requestStatus = request.status = AuthRequestStatus.Verified;
            response.accountStatus = auth.accountStatus;
            response.provisioning = provisioning.account;
        } else {
            response.data = await provider.initAuthRequest(authenticator, request, data);
            authenticator.lastUsed = new Date();
        }

        await this.storage.save(auth);

        this.log("account.startAuthRequest", {
            authRequest: {
                id: request.id,
                type: request.type,
                purpose: request.purpose,
            },
        });

        return response;
    }

    async completeAuthRequest({ email, id, data }: CompleteAuthRequestParams) {
        const auth = (this.context.auth = await this._getAuth(email));

        const request = auth.authRequests.find((m) => m.id === id);
        if (!request) {
            throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Failed to complete auth request.");
        }

        if (request.tries >= 3) {
            throw new Err(ErrorCode.AUTHENTICATION_TRIES_EXCEEDED, "You have exceed your allowed numer of tries!");
        }

        const authenticators = await this._getAuthenticators(auth);

        const authenticator = authenticators.find((m) => m.id === request.authenticatorId);
        if (!authenticator) {
            throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Failed to start auth request.");
        }

        if (request.type !== authenticator.type) {
            throw new Err(
                ErrorCode.AUTHENTICATION_FAILED,
                "The auth request type and authenticator type do not match!"
            );
        }

        const provider = this._getAuthServer(request.type);

        let metaData: any = undefined;

        try {
            metaData = await provider.verifyAuthRequest(authenticator, request, data);

            request.status = AuthRequestStatus.Verified;
            request.verified = new Date();
            if (request.purpose === AuthPurpose.TestAuthenticator) {
                // We're merely testing the authenticator, so we can get rid of the
                // mfa token right away.
                await this.storage.save(auth);
                await this._useAuthToken({
                    email,
                    requestId: request.id,
                    ...request,
                });
            } else {
                authenticator.lastUsed = new Date();
                await this.storage.save(auth);
            }
        } catch (e) {
            request.tries++;
            await this.storage.save(auth);

            this.log("account.completeAuthRequest", {
                authRequest: {
                    id: request.id,
                    type: request.type,
                    purpose: request.purpose,
                },
                success: false,
                error: typeof e === "string" ? e : e.message,
            });

            throw e;
        }

        auth.metaData = auth.metaData ? { ...auth.metaData, ...metaData } : metaData;
        await this.storage.save(auth);

        const deviceTrusted =
            auth && this.context.device && auth.trustedDevices.some(({ id }) => id === this.context.device!.id);

        const provisioning = await this.provisioner.getProvisioning(auth);

        this.log("account.completeAuthRequest", {
            authRequest: {
                id: request.id,
                type: request.type,
                purpose: request.purpose,
            },
            success: true,
        });

        return new CompleteAuthRequestResponse({
            accountStatus: auth.accountStatus,
            deviceTrusted,
            provisioning: provisioning.account,
            legacyData: auth.legacyData,
        });
    }

    async updateAuth({ verifier, keyParams, mfaOrder }: UpdateAuthParams): Promise<void> {
        const { auth } = this._requireAuth();

        if (verifier) {
            auth.verifier = verifier;
            this.log("account.updatePassword");
        }

        if (keyParams) {
            auth.keyParams = keyParams;
        }

        if (mfaOrder) {
            auth.mfaOrder = mfaOrder;
            this.log("account.updateMFAOrder");
        }

        await this.storage.save(auth);
    }

    async removeTrustedDevice(id: string): Promise<void> {
        const { auth } = this._requireAuth();
        const index = auth.trustedDevices.findIndex((d) => d.id === id);
        const device = auth.trustedDevices[index];
        if (index < 0) {
            throw new Err(ErrorCode.NOT_FOUND, "No trusted device with this ID was found!");
        }
        auth.trustedDevices.splice(index, 1);
        this.log("account.removeTrustedDevice", { removedDevice: device.toRaw() });
        await this.storage.save(auth);
    }

    async startCreateSession({
        email,
        authToken,
        asAdmin,
    }: StartCreateSessionParams): Promise<StartCreateSessionResponse> {
        const auth = await this._getAuth(email);

        const deviceTrusted =
            auth && this.context.device && auth.trustedDevices.some(({ id }) => id === this.context.device!.id);

        if (!deviceTrusted) {
            if (!authToken) {
                throw new Err(ErrorCode.AUTHENTICATION_REQUIRED);
            } else {
                await this._useAuthToken({
                    email,
                    token: authToken,
                    purpose: asAdmin ? AuthPurpose.AdminLogin : AuthPurpose.Login,
                });
            }
        }

        if (asAdmin && !this._isAdmin(email)) {
            throw new Err(
                ErrorCode.INSUFFICIENT_PERMISSIONS,
                "This feature is only available for service administrators."
            );
        }

        if (!auth.account) {
            // The user has successfully verified their email address so it's safe to
            // tell them that this account doesn't exist.
            throw new Err(ErrorCode.NOT_FOUND, "An account with this email does not exist!");
        }

        const srpSession = new SRPSession();
        await srpSession.init();
        srpSession.asAdmin = Boolean(asAdmin);

        // Initiate SRP key exchange using the accounts verifier. This also
        // generates the random `B` value which will be passed back to the
        // client.
        const srp = new SRPServer(srpSession);
        await srp.initialize(auth.verifier!);

        auth.srpSessions.push(srpSession);

        await this.storage.save(auth);

        return new StartCreateSessionResponse({
            accountId: auth.account,
            keyParams: auth.keyParams,
            B: srp.B!,
            srpId: srpSession.id,
        });
    }

    private _buildLocationAndDeviceString(
        locationData: { city?: string; country?: string } | undefined,
        deviceInfo: DeviceInfo | undefined
    ) {
        const location = locationData ? `${locationData.city}, ${locationData.country}` : $l("unknown location");
        const device = deviceInfo?.description;

        if (location && device) {
            return `${device} in ${location}`;
        }

        return location;
    }

    async completeCreateSession({
        accountId: account,
        srpId,
        A,
        M,
        addTrustedDevice,
    }: CompleteCreateSessionParams): Promise<Session> {
        // Fetch the account in question
        const acc = (this.context.account = await this.storage.get(Account, account));
        const auth = (this.context.auth = await this._getAuth(acc.email));
        this.context.provisioning = await this.provisioner.getProvisioning(auth);

        // Get the pending SRP context for the given account
        const srpSession = auth.srpSessions.find((s) => s.id === srpId);

        if (!srpSession) {
            throw new Err(ErrorCode.INVALID_SESSION, "No srp session with the given id found!");
        }

        const srp = new SRPServer(srpSession);

        // Apply `A` received from the client to the SRP context. This will
        // compute the common session key and verification value.
        await srp.setA(A);

        // Verify `M`, which is the clients way of proving that they know the
        // accounts master password. This also guarantees that the session key
        // computed by the client and server are identical an can be used for
        // authentication.
        if (!(await getCryptoProvider().timingSafeEqual(M, srp.M1!))) {
            this.log("account.createSession", { success: false });
            ++srpSession.failedAttempts;
            if (srpSession.failedAttempts >= 5) {
                if (this.context.device) {
                    try {
                        await this.removeTrustedDevice(this.context.device.id);
                    } catch (e) {}
                }

                // Delete pending SRP context
                auth.srpSessions = auth.srpSessions.filter((s) => s.id !== srpSession.id);
                await this.storage.save(auth);

                if (acc.settings.notifications.failedLoginAttempts) {
                    try {
                        const location = this._buildLocationAndDeviceString(this.context.location, this.context.device);

                        this.messenger.send(acc.email, new FailedLoginAttemptMessage({ location }));
                    } catch (e) {}
                }
            } else {
                // Saves the updated failed attempts
                await this.storage.save(auth);
            }

            throw new Err(ErrorCode.INVALID_CREDENTIALS);
        }

        // Create a new session object
        const session = new Session();
        session.id = await uuid();
        session.created = new Date();
        session.account = account;
        session.device = this.context.device;
        session.key = srp.K!;
        session.asAdmin = srpSession.asAdmin;

        // Add the session to the list of active sessions
        auth.sessions.push(session.info);

        // Delete pending SRP context
        auth.srpSessions = auth.srpSessions.filter((s) => s.id !== srpSession.id);

        // Persist changes
        await Promise.all([this.storage.save(session), this.storage.save(acc)]);

        // Check if device isn't trusted
        if (this.context.device && !auth.trustedDevices.some(({ id }) => id === this.context.device!.id)) {
            // Add to trusted devices
            if (addTrustedDevice) {
                auth.trustedDevices.push(this.context.device);
            }

            // Send new login notification (it's a new or untrusted device)
            if (acc.settings.notifications.newLogins) {
                try {
                    const location = this._buildLocationAndDeviceString(this.context.location, this.context.device);

                    this.messenger.send(acc.email, new NewLoginMessage({ location }));
                } catch (e) {}
            }
        }
        await this.storage.save(auth);

        // Although the session key is secret in the sense that it should never
        // be transmitted between client and server, it still needs to be
        // stored on both sides, which is why it is included in the [[Session]]
        // classes serialization. So we have to make sure to remove the key
        // explicitly before returning.
        delete session.key;

        this.log("account.createSession", { success: true });

        return session;
    }

    async revokeSession(id: SessionID) {
        const { account, auth } = this._requireAuth();

        const session = await this.storage.get(Session, id);

        if (session.account !== account.id) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const i = auth.sessions.findIndex((s) => s.id === id);
        auth.sessions.splice(i, 1);

        await Promise.all([this.storage.delete(session), this.storage.save(auth)]);

        this.log("account.revokeSession", { revokedSession: { id, device: session.device } });
    }

    async createAccount({
        account,
        auth: { verifier, keyParams },
        authToken,
        verify,
    }: CreateAccountParams): Promise<Account> {
        // For compatibility with v3 clients, which still use the deprecated `verify` property name
        if (verify && !authToken) {
            authToken = verify;
        }

        if (this.config.verifyEmailOnSignup) {
            await this._useAuthToken({ email: account.email, token: authToken, purpose: AuthPurpose.Signup });
        }

        const auth = (this.context.auth = await this._getAuth(account.email));
        this.context.provisioning = await this.provisioner.getProvisioning(auth);

        // Make sure that no account with this email exists and that the email is not blocked from signing up
        if (auth.account) {
            throw new Err(ErrorCode.ACCOUNT_EXISTS, "This account already exists!");
        }

        // Most of the account object is constructed locally but account id and
        // revision are exclusively managed by the server
        account.id = await uuid();
        account.revision = await uuid();
        auth.account = account.id;
        auth.verifier = verifier;
        auth.keyParams = keyParams;
        auth.accountStatus = AccountStatus.Active;

        // Add device to trusted devices
        if (this.context.device && !auth.trustedDevices.some(({ id }) => id === this.context.device!.id)) {
            auth.trustedDevices.push(this.context.device);
        }

        // Provision the private vault for this account
        const vault = new Vault();
        vault.id = await uuid();
        vault.name = "My Vault";
        vault.owner = account.id;
        vault.created = new Date();
        vault.updated = new Date();
        account.mainVault = { id: vault.id };

        // Persist data
        await Promise.all([this.storage.save(account), this.storage.save(vault), this.storage.save(auth)]);

        account = await this.storage.get(Account, account.id);

        this.log("account.create");

        return account;
    }

    async getAccount(id?: AccountID) {
        const { account } = this._requireAuth();

        if (!id || account.id === id) {
            return account;
        }

        this._requireAuth(true);

        this.log("account.getAccount");

        return this.storage.get(Account, id);
    }

    async getAuthInfo() {
        const { auth, account, provisioning } = this._requireAuth();
        this.log("account.getAuthInfo");

        for (const { autoCreate, orgId, orgName } of provisioning.orgs) {
            if (autoCreate && !account.orgs.some((org) => org.id === orgId)) {
                const org = new Org();
                org.name = orgName;
                org.id = orgId;
                org.revision = await uuid();
                org.members = [
                    new OrgMember({
                        accountId: account.id,
                        email: account.email,
                        status: OrgMemberStatus.Provisioned,
                        role: OrgRole.Owner,
                    }),
                ];
                org.created = new Date();
                org.updated = new Date();
                await this.storage.save(org);
                account.orgs.push(org.info);
                await this.storage.save(account);
            }
        }

        return new AuthInfo({
            trustedDevices: auth.trustedDevices,
            authenticators: auth.authenticators,
            mfaOrder: auth.mfaOrder,
            sessions: auth.sessions,
            keyStoreEntries: auth.keyStoreEntries,
            invites: auth.invites,
            provisioning,
        });
    }

    async updateAccount({ name, publicKey, keyParams, encryptionParams, encryptedData, revision, settings }: Account) {
        const { account } = this._requireAuth();

        // Check the revision id to make sure the changes are based on the most
        // recent version stored on the server. This is to ensure continuity in
        // case two clients try to make changes to an account at the same time.
        if (revision !== account.revision) {
            throw new Err(ErrorCode.OUTDATED_REVISION);
        }

        // Update revision id
        account.revision = await uuid();

        const nameChanged = account.name !== name;

        // Update account object
        Object.assign(account, { name, publicKey, keyParams, encryptionParams, encryptedData, settings });

        // Persist changes
        account.updated = new Date();
        await this.storage.save(account);

        // If the account's name has changed, well need to update the
        // corresponding member object on all organizations this account is a
        // member of.
        if (nameChanged) {
            for (const { id } of account.orgs) {
                const org = await this.storage.get(Org, id);
                await this.updateMetaData(org);
                await this.storage.save(org);
            }
        }

        this.log("account.update");

        return account;
    }

    async changeEmail({ authToken, email }: ChangeEmailParams) {
        // Check the email verification token
        await this._useAuthToken({ email, token: authToken, purpose: AuthPurpose.ChangeEmail });

        const { account, auth, provisioning } = this._requireAuth();

        if (provisioning.account.features.changeEmail.disabled) {
            throw new Err(ErrorCode.PROVISIONING_NOT_ALLOWED, "You are not allowed to change your email address.");
        }

        if ((await this._getAuth(email)).accountId) {
            throw new Err(ErrorCode.BAD_REQUEST, "There already exists an account with this email address!");
        }

        await this.storage.delete(auth);
        auth.email = email;
        await auth.init();
        await this.storage.save(auth);

        await this.provisioner.accountEmailChanged({
            prevEmail: account.email,
            newEmail: email,
            accountId: account.id,
        });

        account.email = email;
        account.updated = new Date();
        account.revision = await uuid();
        await this.storage.save(account);

        // If the accounts name or email has changed, well need to update the
        // corresponding member object on all organizations this account is a
        // member of.
        for (const { id } of account.orgs) {
            const org = await this.storage.get(Org, id);
            await this.updateMetaData(org);
            await this.storage.save(org);
        }

        return this.storage.get(Account, account.id);
    }

    async recoverAccount({
        account: { email, publicKey, keyParams, encryptionParams, encryptedData },
        auth: { keyParams: authKeyParams, verifier },
        verify,
    }: RecoverAccountParams) {
        // Check the email verification token
        await this._useAuthToken({ email, token: verify, purpose: AuthPurpose.Recover });

        // Find the existing auth information for this email address
        const auth = (this.context.auth = await this._getAuth(email));
        this.context.provisioning = await this.provisioner.getProvisioning(auth);

        if (!auth.account) {
            throw new Err(ErrorCode.NOT_FOUND, "There is no account with this email address!");
        }

        // Fetch existing account
        const account = await this.storage.get(Account, auth.account);

        // Update account object
        Object.assign(account, { email, publicKey, keyParams, encryptionParams, encryptedData });

        Object.assign(auth, {
            keyParams: authKeyParams,
            verifier,
            trustedDevices: [],
            mfAuthenticators: [],
            mfaRequests: [],
        });

        // Create a new private vault, discarding the old one
        const mainVault = new Vault();
        mainVault.id = account.mainVault.id;
        mainVault.name = "My Vault";
        mainVault.owner = account.id;
        mainVault.created = new Date();
        mainVault.updated = new Date();

        // The new auth object has all the information except the account id
        this.context.device && auth.trustedDevices.push(this.context.device);

        // Revoke all sessions
        auth.sessions.forEach((s) => this.storage.delete(Object.assign(new Session(), s)));

        // Suspend memberships for all orgs that the account is not the owner of.
        // Since the accounts public key has changed, they will need to go through
        // the invite flow again to confirm their membership.
        for (const { id } of account.orgs) {
            const org = await this.storage.get(Org, id);
            if (!org.isOwner(account)) {
                const member = org.getMember(account)!;
                member.status = OrgMemberStatus.Suspended;
                await this.storage.save(org);
            }
        }

        // Persist changes
        await Promise.all([this.storage.save(account), this.storage.save(auth), this.storage.save(mainVault)]);

        this.log("account.recover");

        return account;
    }

    async deleteAccount(id?: AccountID) {
        let { account, auth } = this._requireAuth();

        // Deleting other accounts than one's one is only allowed to super admins
        if (id && account.id !== id) {
            this._requireAuth(true);

            account = await this.storage.get(Account, id);
            auth = await this._getAuth(account.email);
        }

        // Make sure that the account is not owner of any organizations
        const orgs = await Promise.all(account.orgs.map(({ id }) => this.storage.get(Org, id)));

        for (const org of orgs) {
            if (org.isOwner(account)) {
                await this.deleteOrg(org.id);
            } else {
                await org.removeMember(account, false);
                await this.storage.save(org);
            }
        }

        await this.provisioner.accountDeleted(auth);

        // Delete main vault
        await this.storage.delete(Object.assign(new Vault(), { id: account.mainVault }));

        // Revoke all sessions
        await auth.sessions.map((s) => this.storage.delete(Object.assign(new Session(), s)));

        // Delete auth object
        await this.storage.delete(auth);

        // Delete account object
        await this.storage.delete(account);

        this.log("account.delete");
    }

    async createOrg(org: Org) {
        const { account, provisioning } = this._requireAuth();

        if (!org.name) {
            throw new Err(ErrorCode.BAD_REQUEST, "Please provide an organization name!");
        }

        if (
            provisioning.account.status !== ProvisioningStatus.Active ||
            provisioning.account.features.createOrg.disabled
        ) {
            throw new Err(
                ErrorCode.PROVISIONING_NOT_ALLOWED,
                "You're not allowed to create an organization right now."
            );
        }

        org.id = await uuid();
        org.revision = await uuid();
        org.created = new Date();
        org.updated = new Date();
        org.members = [
            new OrgMember({
                accountId: account.id,
                email: account.email,
                role: OrgRole.Owner,
                status: OrgMemberStatus.Provisioned,
            }),
        ];

        await this.storage.save(org);

        account.orgs.push(org.info);
        await this.storage.save(account);

        this.log("org.create", { org: { name: org.name, id: org.id, owner: org.owner } });

        return org;
    }

    async getOrg(id: OrgID) {
        const { account } = this._requireAuth();

        const org = await this.storage.get(Org, id);

        // Only members and super admins can read organization data.
        if (!org.isMember(account)) {
            this._requireAuth(true);
        }

        this.log("org.get", { org: { name: org.name, id: org.id, owner: org.owner } });

        return org;
    }

    async updateOrg({
        id,
        name,
        publicKey,
        keyParams,
        encryptionParams,
        encryptedData,
        signingParams,
        accessors,
        members,
        groups,
        vaults,
        invites,
        revision,
        minMemberUpdated,
        owner,
        directory,
    }: Org) {
        const { account, provisioning } = this._requireAuth();

        // Get existing org based on the id
        const org = await this.storage.get(Org, id);
        const orgInfo = org.info;

        const orgProvisioning = provisioning.orgs.find((o) => o.orgId === id);

        if (!orgProvisioning) {
            throw new Err(ErrorCode.PROVISIONING_NOT_ALLOWED, "Could not find provisioning for this organization!");
        }

        // Check the revision id to make sure the changes are based on the most
        // recent version stored on the server. This is to ensure continuity in
        // case two clients try to make changes to an organization at the same
        // time.
        if (revision !== org.revision) {
            throw new Err(ErrorCode.OUTDATED_REVISION);
        }

        const isOwner = org.owner?.accountId === account.id || org.isOwner(account);
        const isAdmin = isOwner || org.isAdmin(account);

        // Only admins can make any changes to organizations at all.
        if (!isAdmin) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Only admins can make changes to organizations!");
        }

        // Verify that `minMemberUpdated` is equal to or larger than the previous value
        if (minMemberUpdated < org.minMemberUpdated) {
            throw new Err(
                ErrorCode.BAD_REQUEST,
                "`minMemberUpdated` property needs to be equal to or larger than the previous one!"
            );
        }

        const addedMembers = members.filter((m) => !org.isMember(m));
        const removedMembers = org.members.filter(({ email }) => !members.some((m) => email === m.email));
        const addedInvites = invites.filter(({ id }) => !org.getInvite(id));
        const removedInvites = org.invites.filter(({ id }) => !invites.some((inv) => id === inv.id));
        const addedGroups = groups.filter((group) => !org.getGroup(group.name));

        // Only org owners can add or remove members, change roles, create invites or transfer ownership
        if (
            !isOwner &&
            (owner?.email !== org.owner?.email ||
                addedMembers.length ||
                removedMembers.length ||
                addedInvites.length ||
                removedInvites.length ||
                members.some(({ email, role, status }) => {
                    const member = org.getMember({ email });
                    return !member || member.role !== role || member.status !== status;
                }))
        ) {
            throw new Err(
                ErrorCode.INSUFFICIENT_PERMISSIONS,
                "Only organization owners can add or remove members, change roles or create invites!"
            );
        }

        // Check members quota
        if (
            addedMembers.length &&
            orgProvisioning.quota.members !== -1 &&
            members.length > orgProvisioning.quota.members
        ) {
            throw new Err(
                ErrorCode.PROVISIONING_QUOTA_EXCEEDED,
                "You have reached the maximum number of members for this organization!"
            );
        }

        // Check groups quota
        if (addedGroups.length && orgProvisioning.quota.groups !== -1 && groups.length > orgProvisioning.quota.groups) {
            throw new Err(
                ErrorCode.PROVISIONING_QUOTA_EXCEEDED,
                "You have reached the maximum number of groups for this organization!"
            );
        }

        Object.assign(org, {
            members,
            groups,
            vaults,
            directory,
        });

        if (org.directory.syncProvider === "scim") {
            if (!org.directory.scim) {
                org.directory.scim = new ScimSettings();
                org.directory.scim.secret = await getCryptoProvider().randomBytes(16);
                const scimSecret = bytesToBase64(org.directory.scim.secret, true);
                org.directory.scim.secretToken = scimSecret;
                org.directory.scim.url = `${this.config.scimServerUrl}/${org.id}`;
            }
        } else if (org.directory.syncProvider === "none") {
            org.directory.scim = undefined;
            org.directory.syncGroups = false;
            org.directory.syncMembers = false;
        }

        if (org.owner && owner && org.owner.email !== owner.email) {
            await this.provisioner.orgOwnerChanged(org, org.getMember(org.owner)!, org.getMember(owner)!);
        }

        // certain properties may only be updated by organization owners
        if (isOwner) {
            Object.assign(org, {
                name,
                publicKey,
                keyParams,
                encryptionParams,
                encryptedData,
                signingParams,
                accessors,
                invites,
                minMemberUpdated,
            });
        }

        const promises: Promise<void>[] = [];

        // New invites
        for (const invite of addedInvites) {
            promises.push(
                (async () => {
                    const auth = await this._getAuth(invite.email);
                    auth.invites.push({
                        id: invite.id,
                        orgId: org.id,
                        orgName: org.name,
                        expires: invite.expires.toISOString(),
                    });

                    let path = "";
                    const params = new URLSearchParams();
                    params.set("email", invite.email);
                    // params.set("accountStatus", auth.accountStatus);
                    params.set(
                        "invite",
                        stringToBase64(
                            JSON.stringify({
                                id: invite.id,
                                invitor: account.name ? `${account.name} (${account.email})` : account.email,
                                orgId: org.id,
                                orgName: org.name,
                                email: invite.email,
                            })
                        )
                    );

                    // If account does not exist yet, create a email verification code
                    // and send it along with the url so they can skip that step
                    if (auth.accountStatus === AccountStatus.Unregistered) {
                        // account does not exist yet; add verification code to link
                        const signupRequest = new AuthRequest({
                            type: AuthType.Email,
                            purpose: AuthPurpose.Signup,
                        });
                        await signupRequest.init();
                        signupRequest.verified = new Date();
                        signupRequest.status = AuthRequestStatus.Verified;
                        auth.authRequests.push(signupRequest);
                        params.set("authToken", signupRequest.token);
                        path = "/signup";
                    }

                    await this.storage.save(auth);

                    const messageClass =
                        invite.purpose === "confirm_membership" ? ConfirmMembershipInviteMessage : JoinOrgInviteMessage;

                    try {
                        // Send invite link to invitees email address
                        await this.messenger.send(
                            invite.email,
                            new messageClass({
                                orgName: invite.org.name,
                                invitedBy: invite.invitedBy!.name || invite.invitedBy!.email,
                                acceptInviteUrl: `${removeTrailingSlash(
                                    this.config.clientUrl
                                )}${path}?${params.toString()}`,
                            })
                        );
                    } catch (e) {}
                })()
            );

            this.log("org.createInvite", {
                org: orgInfo,
                invite: { id: invite.id, email: invite.email, purpose: invite.purpose },
            });
        }

        for (const invite of removedInvites) {
            promises.push(
                (async () => {
                    try {
                        const auth = await this._getAuth(invite.email);
                        auth.invites = auth.invites.filter((inv) => inv.id !== invite.id);
                        await this.storage.save(auth);
                    } catch (e) {
                        if (e.code !== ErrorCode.NOT_FOUND) {
                            throw e;
                        }
                    }
                })()
            );
            this.log("org.deleteInvite", {
                org: orgInfo,
                invite: { id: invite.id, email: invite.email, purpose: invite.purpose },
            });
        }

        // Removed members
        for (const { accountId, name, email } of removedMembers) {
            if (!accountId) {
                continue;
            }
            promises.push(
                (async () => {
                    try {
                        const acc = await this.storage.get(Account, accountId);
                        acc.orgs = acc.orgs.filter((o) => o.id !== org.id);
                        await this.storage.save(acc);
                    } catch (e) {
                        if (e.code !== ErrorCode.NOT_FOUND) {
                            throw e;
                        }
                    }
                })()
            );
            this.log("org.removeMember", {
                org: orgInfo,
                member: { accountId: id, email, name },
            });
        }

        await this.updateMetaData(org);

        // Send a notification email to let the new member know they've been added
        for (const member of addedMembers) {
            if (member.id !== account.id) {
                try {
                    await this.messenger.send(
                        member.email,
                        new JoinOrgInviteCompletedMessage({
                            orgName: org.name,
                            openAppUrl: `${removeTrailingSlash(this.config.clientUrl)}/org/${org.id}`,
                        })
                    );
                } catch (e) {}
            }
            this.log("org.addMember", {
                org: orgInfo,
                member: { accountId: member.id, email: member.email, name: member.name },
            });
        }

        await Promise.all(promises);

        await this.storage.save(org);

        this.log("org.update", { org: orgInfo });

        return org;
    }

    async deleteOrg(id: OrgID) {
        const { account } = this._requireAuth();

        const org = await this.storage.get(Org, id);

        if (!org.isOwner(account)) {
            this._requireAuth(true);
        }

        // Delete all associated vaults
        await Promise.all(org.vaults.map((v) => this.storage.delete(Object.assign(new Vault(), v))));

        // Remove org from all member accounts
        await Promise.all(
            org.members
                .filter((m) => !!m.accountId)
                .map(async (member) => {
                    const acc = await this.storage.get(Account, member.accountId!);
                    acc.orgs = acc.orgs.filter(({ id }) => id !== org.id);
                    await this.storage.save(acc);
                })
        );

        await this.storage.delete(org);

        await this.provisioner.orgDeleted(org);

        this.log("org.delete", { org: { name: org.name, id: org.id, owner: org.owner } });
    }

    async getVault(id: VaultID) {
        const { account } = this._requireAuth();

        const vault = await this.storage.get(Vault, id);
        const org = vault.org && (await this.storage.get(Org, vault.org.id));

        if (org && org.isSuspended(account)) {
            throw new Err(
                ErrorCode.INSUFFICIENT_PERMISSIONS,
                "This vault cannot be synchronized because you're suspended from it's organization."
            );
        }

        // Accounts can only read their private vaults and vaults they have been assigned to
        // on an organization level. For everyone else, pretend like the vault doesn't exist.
        if ((org && !org.canRead(vault, account)) || (!org && vault.owner !== account.id)) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        this.log("vault.get", {
            vault: { id: vault.id, name: vault.name },
            org: (org && { id: org.id, name: org.name, owner: org.owner }) || undefined,
        });

        return vault;
    }

    async updateVault({ id, keyParams, encryptionParams, accessors, encryptedData, revision }: Vault) {
        const { account, provisioning } = this._requireAuth();

        const vault = await this.storage.get(Vault, id);
        const org = vault.org && (await this.storage.get(Org, vault.org.id));
        const orgProvisioning = org && provisioning.orgs.find((o) => o.orgId === org.id);

        const prov = orgProvisioning || provisioning.account;

        if (!prov) {
            throw new Err(ErrorCode.PROVISIONING_NOT_ALLOWED, "No provisioning found for this vault!");
        }

        if (org && org.isSuspended(account)) {
            throw new Err(
                ErrorCode.INSUFFICIENT_PERMISSIONS,
                "This vault cannot be synchronized because you're suspended from it's organization."
            );
        }

        // Accounts can only read their private vaults and vaults they have been assigned to
        // on an organization level. For everyone else, pretend like the vault doesn't exist.
        if ((org && !org.canRead(vault, account)) || (!org && vault.owner !== account.id)) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        // Vaults can only be updated by accounts that have explicit write access
        if (org && !org.canWrite(vault, account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        if (prov.status === ProvisioningStatus.Frozen) {
            throw new Err(
                ErrorCode.PROVISIONING_NOT_ALLOWED,
                org
                    ? 'You can not make any updates to a vault while it\'s organization is in "frozen" state!'
                    : 'You can\'t make any updates to your vault while your account is in "frozen" state!'
            );
        }

        // Check the revision id to make sure the changes are based on the most
        // recent version stored on the server. This is to ensure continuity in
        // case two clients try to make changes to an organization at the same
        // time.
        if (revision !== vault.revision) {
            throw new Err(ErrorCode.OUTDATED_REVISION);
        }

        // Update vault properties
        Object.assign(vault, { keyParams, encryptionParams, accessors, encryptedData });

        // update revision
        vault.revision = await uuid();
        vault.updated = new Date();

        // Persist changes
        await this.storage.save(vault);

        if (org) {
            // Update Org revision (since vault info has changed)
            await this.updateMetaData(org);
            await this.storage.save(org);
        } else {
            // Update main vault revision info on account
            account.mainVault.revision = vault.revision;
            await this.storage.save(account);
        }

        this.log("vault.update", {
            vault: { id: vault.id, name: vault.name, owner: vault.owner },
            org: (org && { id: org.id, name: org.name, owner: org.owner }) || undefined,
        });

        return this.storage.get(Vault, vault.id);
    }

    async createVault(vault: Vault) {
        const { account, provisioning } = this._requireAuth();

        // Explicitly creating vaults only works in the context of an
        // organization (private vaults are created automatically)
        if (!vault.org) {
            throw new Err(ErrorCode.BAD_REQUEST, "Shared vaults have to be attached to an organization.");
        }

        const org = await this.storage.get(Org, vault.org.id);
        const orgProvisioning = org && provisioning.orgs.find((o) => o.orgId === org.id);

        if (!orgProvisioning) {
            throw new Err(ErrorCode.PROVISIONING_NOT_ALLOWED, "No provisioning found for this vault!");
        }

        // Only admins can create new vaults for an organization
        if (!org.isAdmin(account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        // Create vault object
        vault.id = await uuid();
        vault.owner = account.id;
        vault.created = vault.updated = new Date();
        vault.revision = await uuid();

        // Add to organization
        org.vaults.push({ id: vault.id, name: vault.name });
        org.revision = await uuid();

        // Check vault quota of organization
        if (orgProvisioning.quota.vaults !== -1 && org.vaults.length > orgProvisioning.quota.vaults) {
            throw new Err(
                ErrorCode.PROVISIONING_QUOTA_EXCEEDED,
                "You have reached the maximum number of vaults for this organization!"
            );
        }

        // Persist cahnges
        await Promise.all([this.storage.save(vault), this.storage.save(org)]);

        this.log("vault.create", {
            vault: { id: vault.id, name: vault.name, owner: vault.owner },
            org: { id: org.id, name: org.name, owner: org.owner },
        });

        return vault;
    }

    async deleteVault(id: VaultID) {
        const { account } = this._requireAuth();

        const vault = await this.storage.get(Vault, id);

        // Only vaults that have been created in the context of an
        // organization can be deleted (private vaults are managed
        // by the server implicitly)
        if (!vault.org) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const org = await this.storage.get(Org, vault.org.id);

        // Only org admins can delete vaults
        if (!org.isAdmin(account)) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        // Delete all attachments associated with this vault
        await this.attachmentStorage.deleteAll(vault.id);

        // Remove vault from org
        org.vaults = org.vaults.filter((v) => v.id !== vault.id);

        // Remove any assignments to this vault from members and groups
        for (const each of [...org.getGroupsForVault(vault), ...org.getMembersForVault(vault)]) {
            each.vaults = each.vaults.filter((v) => v.id !== vault.id);
        }

        await this.updateMetaData(org);

        // Save org
        await this.storage.save(org);

        // Delete vault
        await this.storage.delete(vault);

        this.log("vault.delete", {
            vault: { id: vault.id, name: vault.name, owner: vault.owner },
            org: { id: org.id, name: org.name, owner: org.owner },
        });
    }

    async getInvite({ org: orgId, id }: GetInviteParams) {
        const { account } = this._requireAuth();

        const org = await this.storage.get(Org, orgId);
        const invite = org.getInvite(id);

        if (
            !invite ||
            // User may only see invite if they are a vault owner or the invite recipient
            (!org.isOwner(account) && invite.email !== account.email)
        ) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        this.log("org.getInvite", {
            invite: { id: invite.id, email: invite.email, purpose: invite.purpose },
            org: { id: org.id, name: org.name, owner: org.owner },
        });

        return invite;
    }

    async acceptInvite(invite: Invite) {
        // Passed invite object need to have *accepted* status
        if (!invite.accepted) {
            throw new Err(ErrorCode.BAD_REQUEST);
        }

        const { account } = this._requireAuth();

        // Get existing invite object
        const org = await this.storage.get(Org, invite.org.id);
        const existing = org.getInvite(invite.id);

        if (!existing) {
            throw new Err(ErrorCode.NOT_FOUND);
        }

        // Only the invite recipient can accept the invite
        if (existing.email !== account.email) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS, "Only the invite recipient can accept the invite.");
        }

        if (!existing.accepted && invite.invitedBy) {
            // Send message to the creator of the invite notifying them that
            // the recipient has accepted the invite
            try {
                await this.messenger.send(
                    invite.invitedBy.email,
                    new JoinOrgInviteAcceptedMessage({
                        orgName: org.name,
                        invitee: invite.invitee.name || invite.invitee.email,
                        confirmMemberUrl: `${removeTrailingSlash(this.config.clientUrl)}/invite/${org.id}/${invite.id}`,
                    })
                );
            } catch (e) {}
        }

        // Update invite object
        org.invites[org.invites.indexOf(existing)] = invite;

        await this.updateMetaData(org);

        // Persist changes
        await this.storage.save(org);

        this.log("org.acceptInvite", {
            invite: { id: invite.id, email: invite.email, purpose: invite.purpose },
            org: { id: org.id, name: org.name, owner: org.owner },
        });
    }

    async createAttachment(att: Attachment) {
        const { account, provisioning } = this._requireAuth();

        const vault = await this.storage.get(Vault, att.vault);
        const org = vault.org && (await this.storage.get(Org, vault.org.id));

        const allowed = org ? org.canWrite(vault, account) : vault.owner === account.id;

        if (!allowed) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        if (vault.org) {
            const prov = provisioning.orgs.find((o) => o.orgId === vault.org!.id);
            const quota = prov?.quota.storage || 0;
            const org = await this.storage.get(Org, vault.org.id);
            const usagePerVault = await Promise.all(org.vaults.map((v) => this.attachmentStorage.getUsage(v.id)));
            const usage = usagePerVault.reduce((total, each) => total + each, 0);

            if (quota !== -1 && usage + att.size > quota * 1e6) {
                throw new Err(
                    ErrorCode.PROVISIONING_QUOTA_EXCEEDED,
                    "You have reached the file storage limit for this org!"
                );
            }
        } else {
            const quota = provisioning.account.quota.storage;
            const usage = await this.attachmentStorage.getUsage(account.mainVault.id);

            if (quota !== -1 && usage + att.size > quota * 1e6) {
                throw new Err(
                    ErrorCode.PROVISIONING_QUOTA_EXCEEDED,
                    "You have reached the file storage limit for this account!"
                );
            }
        }

        att.id = await uuid();
        await this.attachmentStorage.put(att);

        this.log("vault.createAttachment", {
            attachment: { type: att.type, size: att.size, id: att.id },
            vault: { id: vault.id, name: vault.name, owner: vault.owner },
            org: (org && { id: org.id, name: org.name, owner: org.owner }) || undefined,
        });

        return att.id;
    }

    async getAttachment({ id, vault: vaultId }: GetAttachmentParams) {
        const { account } = this._requireAuth();

        const vault = await this.storage.get(Vault, vaultId);
        const org = vault.org && (await this.storage.get(Org, vault.org.id));

        const allowed = org ? org.canRead(vault, account) : vault.owner === account.id;

        if (!allowed) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        const att = await this.attachmentStorage.get(vaultId, id);

        this.log("vault.getAttachment", {
            attachment: { type: att.type, size: att.size, id: att.id },
            vault: { id: vault.id, name: vault.name, owner: vault.owner },
            org: (org && { id: org.id, name: org.name, owner: org.owner }) || undefined,
        });

        return att;
    }

    async deleteAttachment({ vault: vaultId, id }: DeleteAttachmentParams) {
        const { account } = this._requireAuth();

        const vault = await this.storage.get(Vault, vaultId);
        const org = vault.org && (await this.storage.get(Org, vault.org.id));

        const allowed = org ? org.canWrite(vault, account) : vault.owner === account.id;

        if (!allowed) {
            throw new Err(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }

        await this.attachmentStorage.delete(vaultId, id);

        this.log("vault.deleteAttachment", {
            attachment: { id },
            vault: { id: vault.id, name: vault.name, owner: vault.owner },
            org: (org && { id: org.id, name: org.name, owner: org.owner }) || undefined,
        });
    }

    async getLegacyData({ email, verify }: GetLegacyDataParams) {
        const auth = (this.context.auth = await this._getAuth(email));
        this.context.provisioning = await this.provisioner.getProvisioning(auth);

        if (verify) {
            await this._useAuthToken({ email, token: verify, purpose: AuthPurpose.GetLegacyData });
        } else {
            const { account } = this._requireAuth();
            if (account.email !== email) {
                throw new Err(ErrorCode.BAD_REQUEST);
            }
        }

        if (!this.legacyServer) {
            throw new Err(ErrorCode.NOT_SUPPORTED, "This Padloc instance does not support this feature!");
        }

        const data = await this.legacyServer.getStore(email);

        if (!data) {
            throw new Err(ErrorCode.NOT_FOUND, "No legacy account found.");
        }

        this.log("account.getLegacyData");

        return data;
    }

    async deleteLegacyAccount() {
        if (!this.legacyServer) {
            throw new Err(ErrorCode.NOT_SUPPORTED, "This Padloc instance does not support this feature!");
        }

        const { account } = this._requireAuth();

        await this.legacyServer.deleteAccount(account.email);

        this.log("account.deleteLegacyAccount");
    }

    async updateMetaData(org: Org) {
        org.revision = await uuid();
        org.updated = new Date();

        const promises: Promise<void>[] = [];

        const deletedVaults = new Set<VaultID>();
        const deletedMembers = new Set<AccountID>();

        // Updated related vaults
        for (const vaultInfo of org.vaults) {
            promises.push(
                (async () => {
                    try {
                        const vault = await this.storage.get(Vault, vaultInfo.id);

                        if (
                            vaultInfo.name !== vault.name ||
                            !vault.org ||
                            Object.entries(vaultInfo).some(([key, value]) => vault.org![key] !== value)
                        ) {
                            vault.revision = await uuid();
                            vault.name = vaultInfo.name;
                            vault.org = org.info;
                            await this.storage.save(vault);
                        }

                        vaultInfo.revision = vault.revision;
                    } catch (e) {
                        if (e.code !== ErrorCode.NOT_FOUND) {
                            throw e;
                        }

                        deletedVaults.add(vaultInfo.id);
                    }
                })()
            );
        }

        // Update org info on members
        for (const member of org.members) {
            if (!member.accountId) {
                continue;
            }
            promises.push(
                (async () => {
                    try {
                        const acc = await this.storage.get(Account, member.accountId!);

                        acc.orgs = [...acc.orgs.filter((o) => o.id !== org.id), org.info];

                        await this.storage.save(acc);

                        member.name = acc.name;
                        if (member.email !== acc.email) {
                            // Email has changed, so we have to suspend the member
                            member.email = acc.email;
                            member.status = OrgMemberStatus.Suspended;
                        }
                    } catch (e) {
                        if (e.code !== ErrorCode.NOT_FOUND) {
                            throw e;
                        }

                        deletedMembers.add(member.accountId!);
                    }
                })()
            );
        }

        await Promise.all(promises);

        org.vaults = org.vaults.filter((v) => !deletedVaults.has(v.id));
        org.members = org.members.filter((m) => !m.accountId || !deletedMembers.has(m.accountId));
    }

    async createKeyStoreEntry({ data, authenticatorId }: CreateKeyStoreEntryParams) {
        const { account, auth } = this._requireAuth();
        const authenticator = auth.authenticators.find(
            (a) => a.id === authenticatorId && a.purposes.includes(AuthPurpose.AccessKeyStore)
        );
        if (!authenticator) {
            throw new Err(ErrorCode.NOT_FOUND, "No suitable authenticator found!");
        }

        const entry = new KeyStoreEntry({ accountId: account.id, data, authenticatorId });
        await entry.init();

        await this.storage.save(entry);

        auth.keyStoreEntries.push(entry.info);

        await this.storage.save(auth);

        this.log("account.createKeyStoreEntry", {
            keystoreEntry: { id: entry.id, authenticator: { id: authenticator.id, type: authenticator.type } },
        });

        return entry;
    }

    async getKeyStoreEntry({ id, authToken }: GetKeyStoreEntryParams) {
        const { account } = this._requireAuth();
        const entry = await this.storage.get(KeyStoreEntry, id);

        await this._useAuthToken({
            email: account.email,
            token: authToken,
            purpose: AuthPurpose.AccessKeyStore,
            authenticatorId: entry.authenticatorId,
        });

        this.log("account.getKeyStoreEntry", {
            keyStoreEntry: { id: entry.id },
        });

        return entry;
    }

    async deleteKeyStoreEntry(id: string) {
        const { account, auth } = this._requireAuth();

        const entry = await this.storage.get(KeyStoreEntry, id);

        if (entry.accountId !== account.id) {
            throw new Err(
                ErrorCode.INSUFFICIENT_PERMISSIONS,
                "You don't have the necessary permissions to perform this action!"
            );
        }

        await this.storage.delete(entry);

        auth.keyStoreEntries = auth.keyStoreEntries.filter((e) => e.id !== entry.id);

        await this.storage.save(auth);

        this.log("account.deleteKeyStoreEntry", {
            keyStoreEntry: { id: entry.id },
        });
    }

    async listAccounts(params: ListParams) {
        this._requireAuth(true);
        const items = await this.storage.list(Account, params);
        const total = await this.storage.count(Account, params.query);
        return new ListResponse<Account>({ items, offset: params.offset, total });
    }

    async listOrgs(params: ListParams) {
        this._requireAuth(true);
        const items = await this.storage.list(Org, params);
        const total = await this.storage.count(Org, params.query);
        return new ListResponse<Org>({ items, offset: params.offset, total });
    }

    async listChangeLogEntries(params: ListParams) {
        this._requireAuth(true);
        const items = (await this.changeLogger?.list(params)) || [];
        const total = (await this.changeLogger?.count(params.query)) || 0;
        return new ListResponse<ChangeLogEntry>({ items, offset: params.offset, total });
    }

    async listRequestLogEntries(params: ListParams) {
        this._requireAuth(true);
        const items = (await this.requestLogger?.list(params)) || [];
        const total = (await this.requestLogger?.count(params.query)) || 0;
        return new ListResponse<RequestLogEntry>({ items, offset: params.offset, total });
    }

    private _requireAuth(asAdmin = false): {
        account: Account;
        session: Session;
        auth: Auth;
        provisioning: Provisioning;
    } {
        const { account, session, auth, provisioning } = this.context;

        if (!session || !account || !auth || !provisioning) {
            throw new Err(ErrorCode.INVALID_SESSION);
        }

        if (asAdmin) {
            if (!this._isAdmin(account.email)) {
                throw new Err(
                    ErrorCode.INSUFFICIENT_PERMISSIONS,
                    "You don't have the necessary permissions to use this feature!"
                );
            } else if (!session.asAdmin) {
                throw new Err(ErrorCode.INVALID_SESSION, "Your current session is not valid in this context!");
            }
        }

        return { account, session, auth, provisioning };
    }

    protected async _getAuthenticators(auth: Auth) {
        const purposes = [
            AuthPurpose.Signup,
            AuthPurpose.Login,
            AuthPurpose.AdminLogin,
            AuthPurpose.Recover,
            AuthPurpose.GetLegacyData,
            AuthPurpose.ChangeEmail,
        ];

        const adHocAuthenticators = await Promise.all(
            this.config.defaultAuthTypes.map((type) => this._createAdHocAuthenticator(auth, purposes, type))
        );

        const authenticators = [
            ...auth.authenticators.sort((a, b) => auth.mfaOrder.indexOf(a.id) - auth.mfaOrder.indexOf(b.id)),
            ...adHocAuthenticators,
        ];

        return authenticators;
    }

    private async _createAdHocAuthenticator(auth: Auth, purposes: AuthPurpose[], type: AuthType) {
        const authServer = this._getAuthServer(type);
        const authenticator = new Authenticator({
            type,
            status: AuthenticatorStatus.Active,
            purposes,
            id: `ad_hoc_${auth.email}_${type}`,
        });
        await authServer.initAuthenticator(authenticator, auth);
        return authenticator;
    }

    protected async _getAuth(email: string) {
        let auth: Auth | null = null;

        try {
            auth = await this.storage.get(Auth, await getIdFromEmail(email));
        } catch (e) {
            if (e.code !== ErrorCode.NOT_FOUND) {
                throw e;
            }
        }

        if (!auth) {
            // In previous versions the accounts plain email address was used
            // as the key directly, check if one such entry exists and if so,
            // take it and migrate it to the new key format.
            try {
                auth = await this.storage.get(Auth, email);
                await auth.init();
                await this.storage.save(auth);
                await this.storage.delete(Object.assign(new Auth(), { id: auth.email }));
            } catch (e) {}
        }

        if (!auth) {
            auth = new Auth(email);
            await auth.init();

            // We didn't find anything for this user in the database.
            // Let's see if there is any legacy (v2) data for this user.
            const legacyData = await this.legacyServer?.getStore(email);
            if (legacyData) {
                auth.legacyData = legacyData;
            }
        }

        let updateAuth = false;

        // Revoke unused sessions older than 2 weeks
        const expiredSessions = auth.sessions.filter(
            (session) =>
                Math.max(session.created.getTime(), session.lastUsed.getTime()) < Date.now() - 14 * 24 * 60 * 60 * 1000
        );
        for (const session of expiredSessions) {
            await this.storage.delete(Object.assign(new Session(), session));
            auth.sessions.splice(auth.sessions.indexOf(session), 1);
            updateAuth = true;
        }

        // Remove pending auth requests older than 1 hour
        const expiredAuthRequests = auth.authRequests.filter(
            (authRequest) => authRequest.created.getTime() < Date.now() - 1 * 60 * 60 * 1000
        );
        for (const authRequest of expiredAuthRequests) {
            await this.storage.delete(authRequest);
            auth.authRequests.splice(auth.authRequests.indexOf(authRequest), 1);
            updateAuth = true;
        }

        // Remove pending srp sessions older than 1 hour
        const expiredSRPSessions = auth.srpSessions.filter(
            (SRPSession) => SRPSession.created.getTime() < Date.now() - 1 * 60 * 60 * 1000
        );
        for (const srpSession of expiredSRPSessions) {
            await this.storage.delete(srpSession);
            auth.srpSessions.splice(auth.srpSessions.indexOf(srpSession), 1);
            updateAuth = true;
        }

        // Remove expired invites
        const nonExpiredInvites = auth.invites.filter((invite) => new Date(invite.expires || 0) > new Date());
        if (nonExpiredInvites.length < auth.invites.length) {
            auth.invites = nonExpiredInvites;
            updateAuth = true;
        }

        if (updateAuth) {
            await this.storage.save(auth);
        }

        return auth;
    }

    protected _getAuthServer(type: AuthType) {
        const provider = this.authServers.find((prov) => prov.supportsType(type));
        if (!provider) {
            throw new Err(
                ErrorCode.NOT_SUPPORTED,
                `This multi factor authentication type is not supported by this server!`
            );
        }
        return provider;
    }

    private async _useAuthToken({
        email,
        token,
        purpose,
        authenticatorId,
        requestId,
    }: {
        email: string;
        token: string;
        purpose: AuthPurpose;
        authenticatorId?: string;
        requestId?: string;
    }) {
        const auth = await this._getAuth(email);
        if (!auth) {
            throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Failed to verify auth token");
        }

        const request = auth.authRequests.find(
            (r) =>
                (typeof authenticatorId === "undefined" || r.authenticatorId === authenticatorId) &&
                (typeof requestId === "undefined" || r.id === requestId) &&
                r.token === token &&
                r.status === AuthRequestStatus.Verified &&
                r.purpose === purpose
        );

        if (!request) {
            throw new Err(ErrorCode.AUTHENTICATION_FAILED, "Failed to verify auth token");
        }

        auth.authRequests = auth.authRequests.filter((r) => r.id !== request.id);

        await this.storage.save(auth);
    }

    private _isAdmin(email: string) {
        return this.config.admins.includes(email);
    }
}

/**
 * The Padloc server acts as a central repository for [[Account]]s, [[Org]]s
 * and [[Vault]]s. [[Server]] handles authentication, enforces user privileges
 * and acts as a mediator for key exchange between clients.
 *
 * The server component acts on a strict zero-trust, zero-knowledge principle
 * when it comes to sensitive data, meaning no sensitive data is ever exposed
 * to the server at any point, nor should the server (or the person controlling
 * it) ever be able to temper with critical data or trick users into granting
 * them access to encrypted information.
 */
export class Server {
    constructor(
        public config: ServerConfig,
        public storage: Storage,
        public messenger: Messenger,
        /** Logger to use */
        public logger: Logger = new VoidLogger(),
        public authServers: AuthServer[] = [],
        /** Attachment storage */
        public attachmentStorage: AttachmentStorage,
        public provisioner: Provisioner = new StubProvisioner(),
        public changeLogger?: ChangeLogger,
        public requestLogger?: RequestLogger,
        public legacyServer?: LegacyServer
    ) {}

    private _requestQueue = new Map<AccountID | OrgID, Promise<void>>();

    makeController(ctx: Context) {
        return new (V3Compat(Controller))(this, ctx);
    }

    log(type: string, context: Context, data: any = {}) {
        return this.logger.withContext(context).log(type, data);
    }

    /** Handles an incoming [[Request]], processing it and constructing a [[Reponse]] */
    async handle(req: Request) {
        const res = new Response();
        const context: Context = { id: await uuid() };

        const start = Date.now();

        try {
            context.device = req.device;
            context.location = req.location;
            try {
                await loadLanguage((context.device && context.device.locale) || "en");
            } catch (e) {}

            const controller = this.makeController(context);
            await controller.authenticate(req, context);

            const done = await this._addToQueue(context);

            try {
                res.result = (await controller.process(req)) || null;
            } finally {
                done();
            }

            if (context.session) {
                await context.session.authenticate(res);
            }
        } catch (e) {
            this._handleError(e, req, res, context);
        }

        const responseTime = Date.now() - start;

        this.requestLogger?.log(req, responseTime, context);

        return res;
    }

    private async _addToQueue(context: Context) {
        if (!context.account) {
            return () => {};
        }

        const account = context.account;
        const resolveFuncs: (() => void)[] = [];
        const promises: Promise<void>[] = [];

        for (const { id } of [account, ...account.orgs]) {
            const promise = this._requestQueue.get(id);
            if (promise) {
                promises.push(promise);
            }
            this._requestQueue.set(id, new Promise((resolve) => resolveFuncs.push(resolve)));
        }

        await Promise.all(promises);

        return () => resolveFuncs.forEach((resolve) => resolve());
    }

    private async _handleError(error: Error, req: Request, res: Response, context: Context) {
        const e =
            error instanceof Err
                ? error
                : new Err(
                      ErrorCode.SERVER_ERROR,
                      "Something went wrong while we were processing your request. " +
                          "Our team has been notified and will resolve the problem as soon as possible!",
                      { report: true, error }
                  );

        res.error = {
            code: e.code,
            message: e.message,
        };

        if (e.report) {
            console.error(error);

            const evt = this.log("error", context, {
                error: e.toRaw(),
                request: {
                    method: req.method,
                    params: e.report ? req.params : undefined,
                },
            });

            if (this.config.reportErrors) {
                try {
                    const endpointsWithParams = ["completeRegisterAuthenticator"];
                    const optionalParams = endpointsWithParams.includes(req.method)
                        ? `Params:\n${req.params && JSON.stringify(req.params, null, 4)}\n`
                        : "";

                    await this.messenger.send(
                        this.config.reportErrors,
                        new PlainMessage({
                            message: `The following error occured at ${e.time.toISOString()}:\n\nEndpoint: ${
                                req.method
                            }\n${optionalParams}Device Info:\n${
                                req.device && JSON.stringify(req.device?.toRaw(), null, 4)
                            }\n${e.toString()}${evt?.id ? `Event ID: ${evt.id}` : ""}`,
                        })
                    );
                } catch (e) {}
            }
        }
    }
}
