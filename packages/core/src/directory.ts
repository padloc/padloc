import { Org, OrgID, OrgMember, OrgMemberStatus } from "./org";
import { uuid } from "./util";
import { Server } from "./server";

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
    constructor(public readonly server: Server, providers: DirectoryProvider[] = []) {
        for (const provider of providers) {
            provider.subscribe(this);
        }
    }

    async userCreated(user: DirectoryUser, orgId: string) {
        const org = (orgId && (await this.server.storage.get(Org, orgId))) || null;
        if (org && org.directory.syncProvider === "scim" && org.directory.syncMembers) {
            org.members.push(
                new OrgMember({
                    name: user.name,
                    email: user.email,
                    status: OrgMemberStatus.Provisioned,
                    updated: new Date(),
                })
            );
            // TODO: Remove this
            console.log("---- core/src/directory. userCreated -- pre");
            console.log(org.members);

            await this.server.updateMetaData(org);
            await this.server.storage.save(org);

            // TODO: Remove this
            console.log("---- core/src/directory. userCreated -- post");
            console.log(org.members);
        }
    }

    async userUpdated(user: DirectoryUser, orgId: string): Promise<void> {
        const org = (orgId && (await this.server.storage.get(Org, orgId))) || null;
        if (org && org.directory.syncProvider === "scim" && org.directory.syncMembers) {
            // TODO: Should we store the externalId as well so we can update an email?
            const existingUser = org.members.find((member) => member.email === user.email);

            if (existingUser) {
                existingUser.name = user.name;
                existingUser.updated = new Date();

                await this.server.updateMetaData(org);
                await this.server.storage.save(org);

                // TODO: Remove this
                console.log("---- core/src/directory. userUpdated");
                console.log(org.members);
            }
        }
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
