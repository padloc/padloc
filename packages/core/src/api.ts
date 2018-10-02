import { Session, SessionInfo, Account, Auth, AccountID } from "./auth";
import { Store } from "./store";
import { Org } from "./org";
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

export interface CreateStoreParams {
    name: string;
}

export interface CreateOrgParams {
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

    createStore(params: CreateStoreParams): Promise<Store>;
    getStore(store: Store): Promise<Store>;
    updateStore(store: Store): Promise<Store>;

    createOrg(params: CreateOrgParams): Promise<Org>;
    getOrg(org: Org): Promise<Org>;
    updateOrg(store: Org): Promise<Org>;

    updateInvite(invite: Invite): Promise<Invite>;
    deleteInvite(invite: Invite): Promise<void>;
}
