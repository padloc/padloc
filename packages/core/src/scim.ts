import { AsBytes, Serializable } from "./encoding";
import { OrgID } from "./org";

export interface ScimUser {
    schemas: string[];
    externalId: string;
    userName: string;
    active: boolean;
    meta: {
        resourceType: "User" | "Group";
    };
    name: {
        formatted: string;
    };
    email: string;
}

export interface ScimGroup {}

export class ScimSettings extends Serializable {
    @AsBytes()
    secret!: Uint8Array;

    syncGroups: boolean = true;

    syncMembers: boolean = true;
}

export interface ScimHandler {
    userCreated(user: ScimUser, orgId?: OrgID): Promise<void>;
    userUpdated(user: ScimUser, orgId?: OrgID): Promise<void>;
    userDeleted(user: ScimUser, orgId?: OrgID): Promise<void>;

    groupCreated(group: ScimGroup, orgId: OrgID): Promise<void>;
    groupUpdated(group: ScimGroup, orgId: OrgID): Promise<void>;
    groupDeleted(group: ScimGroup, orgId: OrgID): Promise<void>;
}
