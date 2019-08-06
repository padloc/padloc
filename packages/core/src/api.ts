import { Session, SessionID } from "./session";
import { Account, AccountID } from "./account";
import { Auth } from "./auth";
import { EmailVerificationPurpose } from "./email-verification";
import { Vault, VaultID } from "./vault";
import { Org, OrgID } from "./org";
import { Invite, InviteID } from "./invite";
import { Serializable, bytesToBase64, base64ToBytes } from "./encoding";
import { Attachment, AttachmentID } from "./attachment";
import { Plan, UpdateBillingParams } from "./billing";
import { PBKDF2Params } from "./crypto";

/**
 * Api parameters for creating a new Account to be used with [[API.createAccount]].
 */
export class CreateAccountParams extends Serializable {
    /** The [[Account]] object containing the relevant information */
    account!: Account;

    /**
     * An [[Auth]] object container the verifier and authentication params
     * required for subsequent authentication
     */
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

    validate() {
        return (
            typeof this.verify === "string" &&
            (typeof this.invite === "undefined" ||
                (typeof this.invite === "object" &&
                    typeof this.invite.id === "string" &&
                    typeof this.invite.org === "string"))
        );
    }

    fromRaw({ account, auth, verify, invite }: any) {
        return super.fromRaw({
            verify,
            invite,
            account: account && new Account().fromRaw(account),
            auth: auth && new Auth().fromRaw(auth)
        });
    }
}

/**
 * Parameters for initiating account recovery to be used with [[API.recoverAccount]]
 */
export class RecoverAccountParams extends Serializable {
    /** The newly initialized [[Account]] object */
    account!: Account;

    /** The new authentication parameters */
    auth!: Auth;

    /** An email verification token obtained from [[API.completeEmailVerification]] */
    verify!: string;

    constructor(props?: Partial<RecoverAccountParams>) {
        super();
        props && Object.assign(this, props);
    }

    validate() {
        return typeof this.verify === "string";
    }

    fromRaw({ account, auth, verify }: any) {
        return super.fromRaw({ verify, account: new Account().fromRaw(account), auth: new Auth().fromRaw(auth) });
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

    validate() {
        return typeof this.email === "string" && this.purpose in EmailVerificationPurpose;
    }

    fromRaw({ email, purpose }: any) {
        return super.fromRaw({ email, purpose });
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

    validate() {
        return typeof this.email === "string" || typeof this.code === "string";
    }

    fromRaw({ email, code }: any) {
        return super.fromRaw({ email, code });
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

    validate() {
        return (
            typeof this.email === "string" && (typeof this.verify === "string" || typeof this.verify === "undefined")
        );
    }

    fromRaw({ email, verify }: any) {
        return super.fromRaw({ email, verify });
    }
}

/**
 * The response object received from [[API.initAuth]]
 */
export class InitAuthResponse extends Serializable {
    /** The account id */
    account: AccountID = "";

    /** The key derivation parameters used for authentication */
    keyParams: PBKDF2Params = new PBKDF2Params();

    /** A random value used for SRP session negotiation */
    B!: Uint8Array;

    constructor(props?: Partial<InitAuthResponse>) {
        super();
        props && Object.assign(this, props);
    }

    fromRaw({ account, keyParams, B }: any) {
        return super.fromRaw({
            account,
            keyParams: new PBKDF2Params().fromRaw(keyParams),
            B: base64ToBytes(B)
        });
    }

    toRaw() {
        return {
            ...super.toRaw(),
            B: bytesToBase64(this.B)
        };
    }
}

/**
 * Parameters for creating a new [[Session]] through [[API.createSession]]
 */
export class CreateSessionParams extends Serializable {
    /** The id of the [[Account]] to create the session for */
    account!: AccountID;

    /** Verification value used for SRP session negotiation */
    M!: Uint8Array;

    /** Random value used form SRP session negotiation */
    A!: Uint8Array;

    constructor(props?: Partial<CreateSessionParams>) {
        super();
        props && Object.assign(this, props);
    }

    validate() {
        return typeof this.account === "string";
    }

    toRaw() {
        return {
            account: this.account,
            M: bytesToBase64(this.M),
            A: bytesToBase64(this.A)
        };
    }

    fromRaw({ account, M, A }: any) {
        return super.fromRaw({ account, M: base64ToBytes(M), A: base64ToBytes(A) });
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

    validate() {
        return typeof this.org === "string" && typeof this.id === "string";
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

    validate() {
        return typeof this.vault === "string" && typeof this.id === "string";
    }
}

export class DeleteAttachmentParams extends GetAttachmentParams {}

/**
 * Transport-agnostic interface defining communication
 * between [[Client]] and [[Server]] instances.
 */
export interface API {
    /**
     * Request verification of a given email address. This will send a verification code
     * to the email in question which can then be exchanged for a verification token via
     * [[completeEmailVerification]].
     */
    requestEmailVerification(params: RequestEmailVerificationParams): Promise<void>;

    /**
     * Complete the email verification process by providing a verification code received
     * via email. Returns a verification token that can be used in other api calls like
     * [[createAccount]] or [[recoverAccount]].
     */
    completeEmailVerification(params: CompleteEmailVerificationParams): Promise<string>;

    /**
     * Initiate the login procedure for a given account by requesting the authentication params
     * which are required for proceeding with [[createSession]].
     */
    initAuth(params: InitAuthParams): Promise<InitAuthResponse>;

    /**
     * Update the authentication params stored on the server. This is usually used
     * in case a users master password has changed.
     */
    updateAuth(params: Auth): Promise<void>;

    /**
     * Create new [[Session]] which can be used to authenticate future request
     */
    createSession(params: CreateSessionParams): Promise<Session>;

    /**
     * Revoke a [[Session]], effectively logging out any client authenticated with it
     */
    revokeSession(id: SessionID): Promise<void>;

    /**
     * Create a new [[Account]]
     */
    createAccount(params: CreateAccountParams): Promise<Account>;

    /**
     * Get the [[Account]] associated with the current session
     *
     * @authentication_required
     */
    getAccount(): Promise<Account>;

    /**
     * Update the [[Account]] associated with the current session.
     *
     * @authentication_required
     */
    updateAccount(account: Account): Promise<Account>;

    /**
     * Initiate account recovery
     */
    recoverAccount(params: RecoverAccountParams): Promise<Account>;

    /**
     * Delete current account
     */
    deleteAccount(): Promise<void>;

    /**
     * Create a new [[Org]]
     *
     * @authentication_required
     */
    createOrg(params: Org): Promise<Org>;

    /**
     * Get the [[Org]] for a given `id`.
     *
     * @authentication_required
     *
     * Requires the authenticated account to be a member of the given organization
     */
    getOrg(id: OrgID): Promise<Org>;

    /**
     * Updates a given [[Org]]
     *
     * @authentication_required
     *
     * Updating members, organization name or pubic/private keys requires the [[OrgRole.Owner]]
     * role, while any other changes require the [[OrgRole.Admin]] role.
     */
    updateOrg(org: Org): Promise<Org>;

    deleteOrg(id: OrgID): Promise<void>;

    /**
     * Create a new vault
     *
     * @authentication_required
     *
     * Requires the [[OrgRole.Admin]] role on the associated organization
     */
    createVault(vault: Vault): Promise<Vault>;

    /**
     * Get the [[Vault]] with the given `id`
     *
     * @authentiation_required
     *
     * If the vault belongs to an organization, the authenticated account needs to
     * be assigned to the given vault either directly or through a [[Group]].
     * Otherwise, only access to the accounts private vault is allowed.
     */
    getVault(id: VaultID): Promise<Vault>;

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
    updateVault(vault: Vault): Promise<Vault>;

    /**
     * Delete the [[Vault]] with the given `id`
     *
     * @authentication_required
     *
     * Requires at least the [[OrgRole.Admin]] role on the organization the vault
     * belongs to. Private vaults cannot be deleted.
     */
    deleteVault(id: VaultID): Promise<void>;

    /**
     * Get an [[Invite]].
     *
     * @authentication_required
     *
     * Requires the authenticated account to either be an [[OrgRole.Owner]] of
     * the associated organization or the recipient of the invite.
     */
    getInvite(params: GetInviteParams): Promise<Invite>;

    /**
     * Accept an [[Invite]]
     *
     * @authentication_required
     *
     * Requires the authenticated account to be the recipient of the invite.
     */
    acceptInvite(invite: Invite): Promise<void>;

    createAttachment(attachment: Attachment): Promise<Attachment>;
    getAttachment(attachment: GetAttachmentParams): Promise<Attachment>;
    deleteAttachment(attachment: DeleteAttachmentParams): Promise<void>;

    updateBilling(params: UpdateBillingParams): Promise<void>;
    getPlans(): Promise<Plan[]>;
}
