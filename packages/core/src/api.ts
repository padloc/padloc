import { Session, Account, Organization, Invite } from "./auth";
import { AccountStore, SharedStore } from "./data";

export interface CreateAccountParams {
    email: string;
    name: string;
    publicKey: string;
}

export interface CreateSharedStoreParams {
    name: string;
}

export interface CreateOrganizationParams {
    name: string;
}

export interface API {
    createSession(email: string): Promise<Session>;
    activateSession(id: string, code: string): Promise<Session>;
    revokeSession(id: string): Promise<void>;

    createAccount(params: CreateAccountParams): Promise<Account>;
    getAccount(account: Account): Promise<Account>;
    updateAccount(account: Account): Promise<Account>;

    getAccountStore(store: AccountStore): Promise<AccountStore>;
    updateAccountStore(store: AccountStore): Promise<AccountStore>;

    createSharedStore(params: CreateSharedStoreParams): Promise<SharedStore>;
    getSharedStore(store: SharedStore): Promise<SharedStore>;
    updateSharedStore(store: SharedStore): Promise<SharedStore>;

    createOrganization(params: CreateOrganizationParams): Promise<Organization>;
    getOrganization(org: Organization): Promise<Organization>;
    updateOrganization(store: Organization): Promise<Organization>;

    updateInvite(org: Organization, invite: Invite): Promise<Organization>;
    // updateInvite(invite: Invite, store: SharedStore): Promise<SharedStore>;
}
