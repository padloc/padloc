import { Session } from "./session";
import { Account, AccountID } from "./account";
import { Auth, EmailVerificationPurpose } from "./auth";
import { Vault } from "./vault";
import { Invite } from "./invite";
import { Base64String } from "./encoding";
import { Attachment } from "./attachment";

export interface CreateAccountParams {
    account: Account;
    auth: Auth;
    verify: string;
    invite?: {
        id: string;
        vault: string;
    };
}

export interface RecoverAccountParams {
    account: Account;
    auth: Auth;
    verify: string;
}

export interface CreateVaultParams {
    name: string;
}

export interface API {
    requestEmailVerification(params: { email: string; purpose?: EmailVerificationPurpose }): Promise<void>;
    completeEmailVerification(params: { email: string; code: string }): Promise<string>;

    initAuth(email: string): Promise<{ auth: Auth; B: Base64String }>;
    updateAuth(params: Auth): Promise<void>;

    createSession(params: { account: AccountID; M: Base64String; A: Base64String }): Promise<Session>;
    revokeSession(params: Session): Promise<void>;

    createAccount(params: CreateAccountParams): Promise<Account>;
    getAccount(account: Account): Promise<Account>;
    updateAccount(account: Account): Promise<Account>;
    recoverAccount(params: RecoverAccountParams): Promise<Account>;

    createVault(params: CreateVaultParams): Promise<Vault>;
    getVault(vault: Vault): Promise<Vault>;
    updateVault(vault: Vault): Promise<Vault>;
    deleteVault(vault: Vault): Promise<void>;

    getInvite(params: { vault: string; id: string }): Promise<Invite>;
    acceptInvite(invite: Invite): Promise<void>;

    createAttachment(attachment: Attachment): Promise<Attachment>;
    getAttachment(attachment: Attachment): Promise<Attachment>;
    deleteAttachment(attachment: Attachment): Promise<void>;
}
