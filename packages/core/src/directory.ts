import { Org, OrgID, OrgMember, OrgMemberStatus } from "./org";
import { uuid } from "./util";
import { Storage } from "./storage";

export interface DirectoryUser {
    email: string;
    name: string;
    active: boolean;
}

export interface DirectoryGroup {
    name: string;
    members: DirectoryUser[];
}

export interface DirectorySubscriber {
    userCreated(user: DirectoryUser, orgId?: OrgID): Promise<void>;
    userUpdated(user: DirectoryUser, orgId?: OrgID): Promise<void>;
    userDeleted(user: DirectoryUser, orgId?: OrgID): Promise<void>;

    groupCreated(group: DirectoryGroup, orgId: OrgID): Promise<void>;
    groupUpdated(group: DirectoryGroup, orgId: OrgID): Promise<void>;
    groupDeleted(group: DirectoryGroup, orgId: OrgID): Promise<void>;
}

export interface DirectoryProvider {
    subscribe(sub: DirectorySubscriber): void;
}

export class DirectorySync implements DirectorySubscriber {
    constructor(public readonly storage: Storage, providers: DirectoryProvider[] = []) {
        for (const provider of providers) {
            provider.subscribe(this);
        }
    }

    async userCreated(user: DirectoryUser, orgId?: string) {
        const org = (orgId && (await this.storage.get(Org, orgId))) || null;
        if (org && org.directory.syncProvider === "scim" && org.directory.syncMembers) {
            org.members.push(
                new OrgMember({
                    email: user.email,
                    status: OrgMemberStatus.Provisioned,
                    updated: new Date(),
                })
            );
            org.revision = await uuid();
            org.updated = new Date();
        }
    }

    userUpdated(_user: DirectoryUser, _orgId?: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    userDeleted(_user: DirectoryUser, _orgId?: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    groupCreated(_group: DirectoryGroup, _orgId: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    groupUpdated(_group: DirectoryGroup, _orgId: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    groupDeleted(_group: DirectoryGroup, _orgId: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
