import { Session, Account, AccountID } from "./auth";
import { Store } from "./store";
import { Base64String } from "./encoding";
import { RSAPublicKey, PBKDF2Params, AESEncryptionParams } from "./crypto";

export interface CreateAccountParams {
    email: string;
    name: string;
    publicKey: RSAPublicKey;
    encPrivateKey: Base64String;
    keyParams: PBKDF2Params;
    encryptionParams: AESEncryptionParams;
    verifier: Base64String;
    emailVerification: string;
}

export interface CreateStoreParams {
    name: string;
}

export interface API {
    verifyEmail(params: { email: string }): Promise<void>;
    initAuth(params: { email: string }): Promise<{ account: AccountID; keyParams: PBKDF2Params; B: Base64String }>;

    createSession(params: { account: AccountID; M: Base64String; A: Base64String }): Promise<Session>;
    revokeSession(params: Session): Promise<void>;

    createAccount(params: CreateAccountParams): Promise<Account>;
    getAccount(account: Account): Promise<Account>;
    updateAccount(account: Account): Promise<Account>;

    createStore(params: CreateStoreParams): Promise<Store>;
    getStore(store: Store): Promise<Store>;
    updateStore(store: Store): Promise<Store>;

    // createOrganization(params: CreateOrganizationParams): Promise<Organization>;
    // getOrganization(org: Organization): Promise<Organization>;
    // updateOrganization(store: Organization): Promise<Organization>;

    // updateInvite(org: Organization, invite: Invite): Promise<Organization>;
    // updateInvite(invite: Invite, store: SharedStore): Promise<SharedStore>;
}
