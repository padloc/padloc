import { Session, SessionID } from "./session";
import { Account, AccountID } from "./account";
import { Auth } from "./auth";
import { EmailVerificationPurpose } from "./email-verification";
import { Vault, VaultID } from "./vault";
import { Org, OrgID } from "./org";
import { Invite, InviteID } from "./invite";
import { Serializable, SerializableConstructor, AsBytes, AsSerializable } from "./encoding";
import { Attachment, AttachmentID } from "./attachment";
import { BillingProviderInfo, UpdateBillingParams } from "./billing";
import { PBKDF2Params } from "./crypto";
import { PBES2Container } from "./container";
import { RequestProgress } from "./transport";

/**
 * Api parameters for creating a new Account to be used with [[API.createAccount]].
 */
export class CreateAccountParams extends Serializable {
    /** The [[Account]] object containing the relevant information */
    @AsSerializable(Account)
    account!: Account;

    /**
     * An [[Auth]] object container the verifier and authentication params
     * required for subsequent authentication
     */
    @AsSerializable(Auth)
    auth!: Auth;

    /**
     * The verification token obtained from [[API.completeEmailVerification]].
     */
    verify!: string;

    /**
     * The corresponding [[InviteID]] and [[OrgID]] if signup was initiated
     * through an invite link.
     *
     * @optional
     */
    invite?: {
        id: InviteID;
        org: OrgID;
    };

    constructor(props?: Partial<CreateAccountParams>) {
        super();
        props && Object.assign(this, props);
    }
}

/**
 * Parameters for initiating account recovery to be used with [[API.recoverAccount]]
 */
export class RecoverAccountParams extends Serializable {
    /** The newly initialized [[Account]] object */
    @AsSerializable(Account)
    account!: Account;

    /** The new authentication parameters */
    @AsSerializable(Auth)
    auth!: Auth;

    /** An email verification token obtained from [[API.completeEmailVerification]] */
    verify!: string;

    constructor(props?: Partial<RecoverAccountParams>) {
        super();
        props && Object.assign(this, props);
    }
}

/**
 * Parameters for requesting email verfication through [[API.requestEmailVerification]]
 */
export class RequestEmailVerificationParams extends Serializable {
    /** The email address to be verified */
    email = "";

    /** The purpose of the email verification */
    purpose: EmailVerificationPurpose = EmailVerificationPurpose.Signup;

    constructor(props?: Partial<RequestEmailVerificationParams>) {
        super();
        props && Object.assign(this, props);
    }
}

/**
 * Parameters for completing email verification through [[API.completeEmailVerification]]
 */
export class CompleteEmailVerificationParams extends Serializable {
    /** The email address to be verified */
    email: string = "";

    /** The verification code received via email after calling [[API.requestEmailVerification]] */
    code: string = "";

    constructor(props?: Partial<CompleteEmailVerificationParams>) {
        super();
        props && Object.assign(this, props);
    }
}

/**
 * Parameters for initiating authentication through [[API.initAuth]]
 */
export class InitAuthParams extends Serializable {
    /** The email address of the [[Account]] in question */
    email = "";

    /**
     * The verification token obtained from [[API.completeEmailVerification]].
     */
    verify?: string;

    constructor(props?: Partial<InitAuthParams>) {
        super();
        props && Object.assign(this, props);
    }
}

/**
 * The response object received from [[API.initAuth]]
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
    account!: AccountID;

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

/**
 * Parameters for fetching an [[Invite]]
 */
export class GetInviteParams extends Serializable {
    /** The organization id */
    org: OrgID = "";

    /** The invite id */
    id: InviteID = "";

    constructor(props?: Partial<GetInviteParams>) {
        super();
        props && Object.assign(this, props);
    }
}

/**
 * Parameters for fetching an [[Attachment]]
 */
export class GetAttachmentParams extends Serializable {
    /** The vault id */
    vault: VaultID = "";

    /** The attachment id */
    id: AttachmentID = "";

    constructor(props?: Partial<GetAttachmentParams>) {
        super();
        props && Object.assign(this, props);
    }
}

export class DeleteAttachmentParams extends GetAttachmentParams {}

export class GetLegacyDataParams {
    constructor(vals: Partial<GetLegacyDataParams> = {}) {
        Object.assign(this, vals);
    }

    email: string = "";
    verify?: string;
}

interface HandlerDefinition {
    method: string;
    input?: SerializableConstructor;
    output?: SerializableConstructor;
}

/**
 * Decorator for defining request handler methods
 */
function Handler(
    input: SerializableConstructor | StringConstructor | undefined,
    output: SerializableConstructor | StringConstructor | undefined
) {
    return (proto: API, method: string) => {
        if (!proto.handlerDefinitions) {
            proto.handlerDefinitions = [];
        }
        proto.handlerDefinitions.push({
            method,
            input: input === String ? undefined : (input as SerializableConstructor | undefined),
            output: output === String ? undefined : (output as SerializableConstructor | undefined)
        });
    };
}

export type PromiseWithProgress<T> = Promise<T> & { progress?: RequestProgress };

/**
 * Transport-agnostic interface defining communication
 * between [[Client]] and [[Server]] instances.
 */
export class API {
    handlerDefinitions!: HandlerDefinition[];

    /**
     * Request verification of a given email address. This will send a verification code
     * to the email in question which can then be exchanged for a verification token via
     * [[completeEmailVerification]].
     */
    @Handler(RequestEmailVerificationParams, undefined)
    requestEmailVerification(_params: RequestEmailVerificationParams): PromiseWithProgress<void> {
        throw "Not implemented";
    }

    /**
     * Complete the email verification process by providing a verification code received
     * via email. Returns a verification token that can be used in other api calls like
     * [[createAccount]] or [[recoverAccount]].
     */
    @Handler(CompleteEmailVerificationParams, String)
    completeEmailVerification(_params: CompleteEmailVerificationParams): PromiseWithProgress<string> {
        throw "Not implemented";
    }

    /**
     * Initiate the login procedure for a given account by requesting the authentication params
     * which are required for proceeding with [[createSession]].
     */
    @Handler(InitAuthParams, InitAuthResponse)
    initAuth(_params: InitAuthParams): PromiseWithProgress<InitAuthResponse> {
        throw "Not implemented";
    }

    /**
     * Update the authentication params stored on the server. This is usually used
     * in case a users master password has changed.
     */
    @Handler(Auth, undefined)
    updateAuth(_params: Auth): PromiseWithProgress<void> {
        throw "Not implemented";
    }

    /**
     * Create new [[Session]] which can be used to authenticate future request
     */
    @Handler(CreateSessionParams, Session)
    createSession(_params: CreateSessionParams): PromiseWithProgress<Session> {
        throw "Not implemented";
    }

    /**
     * Revoke a [[Session]], effectively logging out any client authenticated with it
     */
    @Handler(String, undefined)
    revokeSession(_id: SessionID): PromiseWithProgress<void> {
        throw "Not implemented";
    }

    /**
     * Create a new [[Account]]
     */
    @Handler(CreateAccountParams, Account)
    createAccount(_params: CreateAccountParams): PromiseWithProgress<Account> {
        throw "Not implemented";
    }

    /**
     * Get the [[Account]] associated with the current session
     *
     * @authentication_required
     */
    @Handler(undefined, Account)
    getAccount(): PromiseWithProgress<Account> {
        throw "Not implemented";
    }

    /**
     * Update the [[Account]] associated with the current session.
     *
     * @authentication_required
     */
    @Handler(Account, Account)
    updateAccount(_account: Account): PromiseWithProgress<Account> {
        throw "Not implemented";
    }

    /**
     * Initiate account recovery
     */
    @Handler(RecoverAccountParams, Account)
    recoverAccount(_params: RecoverAccountParams): PromiseWithProgress<Account> {
        throw "Not implemented";
    }

    /**
     * Delete current account
     */
    @Handler(undefined, undefined)
    deleteAccount(): PromiseWithProgress<void> {
        throw "Not implemented";
    }

    /**
     * Create a new [[Org]]
     *
     * @authentication_required
     */
    @Handler(Org, Org)
    createOrg(_params: Org): PromiseWithProgress<Org> {
        throw "Not implemented";
    }

    /**
     * Get the [[Org]] for a given `id`.
     *
     * @authentication_required
     *
     * Requires the authenticated account to be a member of the given organization
     */
    @Handler(undefined, Org)
    getOrg(_id: OrgID): PromiseWithProgress<Org> {
        throw "Not implemented";
    }

    /**
     * Updates a given [[Org]]
     *
     * @authentication_required
     *
     * Updating members, organization name or pubic/private keys requires the [[OrgRole.Owner]]
     * role, while any other changes require the [[OrgRole.Admin]] role.
     */
    @Handler(Org, Org)
    updateOrg(_org: Org): PromiseWithProgress<Org> {
        throw "Not implemented";
    }

    @Handler(String, undefined)
    deleteOrg(_id: OrgID): PromiseWithProgress<void> {
        throw "Not implemented";
    }

    /**
     * Create a new vault
     *
     * @authentication_required
     *
     * Requires the [[OrgRole.Admin]] role on the associated organization
     */
    @Handler(Vault, Vault)
    createVault(_vault: Vault): PromiseWithProgress<Vault> {
        throw "Not implemented";
    }

    /**
     * Get the [[Vault]] with the given `id`
     *
     * @authentiation_required
     *
     * If the vault belongs to an organization, the authenticated account needs to
     * be assigned to the given vault either directly or through a [[Group]].
     * Otherwise, only access to the accounts private vault is allowed.
     */
    @Handler(String, Vault)
    getVault(_id: VaultID): PromiseWithProgress<Vault> {
        throw "Not implemented";
    }

    /**
     * Update the given [[Vault]]
     *
     * @authentiation_required
     *
     * If vault belongs to an organization, the authenticated account needs to
     * be be assigned to the given vault either directly or through a [[Group]]
     * and have explicit write access. Otherwise, only access to the accounts
     * private vault is allowed.
     */
    @Handler(Vault, Vault)
    updateVault(_vault: Vault): PromiseWithProgress<Vault> {
        throw "Not implemented";
    }

    /**
     * Delete the [[Vault]] with the given `id`
     *
     * @authentication_required
     *
     * Requires at least the [[OrgRole.Admin]] role on the organization the vault
     * belongs to. Private vaults cannot be deleted.
     */
    @Handler(String, undefined)
    deleteVault(_id: VaultID): PromiseWithProgress<void> {
        throw "Not implemented";
    }

    /**
     * Get an [[Invite]].
     *
     * @authentication_required
     *
     * Requires the authenticated account to either be an [[OrgRole.Owner]] of
     * the associated organization or the recipient of the invite.
     */
    @Handler(GetInviteParams, Invite)
    getInvite(_params: GetInviteParams): PromiseWithProgress<Invite> {
        throw "Not implemented";
    }

    /**
     * Accept an [[Invite]]
     *
     * @authentication_required
     *
     * Requires the authenticated account to be the recipient of the invite.
     */
    @Handler(Invite, undefined)
    acceptInvite(_invite: Invite): PromiseWithProgress<void> {
        throw "Not implemented";
    }

    @Handler(Attachment, String)
    createAttachment(_attachment: Attachment): PromiseWithProgress<AttachmentID> {
        throw "Not implemented";
    }

    @Handler(GetAttachmentParams, Attachment)
    getAttachment(_attachment: GetAttachmentParams): PromiseWithProgress<Attachment> {
        throw "Not implemented";
    }

    @Handler(DeleteAttachmentParams, undefined)
    deleteAttachment(_attachment: DeleteAttachmentParams): PromiseWithProgress<void> {
        throw "Not implemented";
    }

    @Handler(UpdateBillingParams, undefined)
    updateBilling(_params: UpdateBillingParams): PromiseWithProgress<void> {
        throw "Not implemented";
    }

    @Handler(undefined, BillingProviderInfo)
    getBillingProviders(): PromiseWithProgress<BillingProviderInfo[]> {
        throw "Not implemented";
    }

    @Handler(undefined, PBES2Container)
    getLegacyData(_params: GetLegacyDataParams): PromiseWithProgress<PBES2Container> {
        throw "Not implemented";
    }
}
