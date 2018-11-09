import { Session, SessionInfo, Account, Auth, AccountID } from "./auth";
import { Vault } from "./vault";
import { Invite } from "./invite";
import { Base64String } from "./encoding";

export interface CreateAccountParams {
    account: Account;
    auth: Auth;
    emailVerification: {
        id: string;
        code: string;
    };
}

export interface CreateVaultParams {
    name: string;
}

export interface API {
    verifyEmail(params: { email: string }): Promise<{ id: string }>;

    initAuth(params: { email: string }): Promise<{ auth: Auth; B: Base64String }>;

    createSession(params: { account: AccountID; M: Base64String; A: Base64String }): Promise<Session>;
    revokeSession(params: Session): Promise<void>;
    getSessions(): Promise<SessionInfo[]>;

    createAccount(params: CreateAccountParams): Promise<Account>;
    getAccount(account: Account): Promise<Account>;
    updateAccount(account: Account): Promise<Account>;

    createVault(params: CreateVaultParams): Promise<Vault>;
    getVault(vault: Vault): Promise<Vault>;
    updateVault(vault: Vault): Promise<Vault>;

    getInvite(params: { vault: string; id: string }): Promise<Invite>;
    acceptInvite(invite: Invite): Promise<void>;
}
