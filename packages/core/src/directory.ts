import { Org, OrgID } from "./org";

export interface DirectoryUser {
    externalId?: string;
    email: string;
    active: boolean;
    name?: string;
}

export interface DirectoryGroup {
    externalId?: string;
    name: string;
    members: DirectoryUser[];
}

export interface DirectorySubscriber {
    userCreated(user: DirectoryUser, orgId: OrgID): Promise<void>;
    userUpdated(user: DirectoryUser, orgId: OrgID, previousEmail?: string): Promise<void>;
    userDeleted(user: DirectoryUser, orgId: OrgID): Promise<void>;

    groupCreated(group: DirectoryGroup, orgId: OrgID): Promise<void>;
    groupUpdated(group: DirectoryGroup, orgId: OrgID, previousName?: string): Promise<void>;
    groupDeleted(group: DirectoryGroup, orgId: OrgID): Promise<void>;
}

export interface DirectoryProvider {
    subscribe(sub: DirectorySubscriber): void;
}

export interface DirectoryService {
    update(org: Org): Promise<void>;
}
