import { Storage } from "@padloc/core/src/storage";
import { Config, ConfigParam } from "@padloc/core/src/config";
import { Org, OrgID } from "@padloc/core/src/org";
import { DirectoryProvider, DirectorySubscriber, DirectoryUser, DirectoryGroup } from "@padloc/core/src/directory";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { getCryptoProvider } from "@padloc/core/src/platform";
import { base64ToBytes } from "@padloc/core/src/encoding";
import { setPath, uuid } from "@padloc/core/src/util";
import { readBody } from "./transport/http";
import { OrgProvisioning } from "@padloc/core/src/provisioning";

export class ScimServerConfig extends Config {
    @ConfigParam()
    url = "http://localhost:5000";
    @ConfigParam("number")
    port: number = 5000;
}

interface ScimUserEmail {
    value: string;
    type: "work" | "home" | "other";
    primary?: boolean;
}

interface ScimUserName {
    formatted: string;
    givenName?: string;
    familyName?: string;
}

interface ScimUser {
    id?: string;
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"];
    externalId?: string;
    userName?: string;
    active: boolean;
    meta: {
        resourceType: "User";
        created: string;
        lastModified: string;
        location: string;
        version?: string;
    };
    name: ScimUserName;
    displayName?: string;
    emails?: ScimUserEmail[];
}

interface ScimUserPatchOperation {
    op: "replace" | "Replace";
    path?: "userName" | "name.formatted" | "active" | "name" | "emails";
    value: any;
}

interface ScimUserPatch {
    Operations: ScimUserPatchOperation[];
}

interface ScimGroupMember {
    $ref: string | null;
    value: string;
    display?: string;
}

interface ScimGroup {
    id?: string;
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"];
    externalId?: string;
    displayName: string;
    meta: {
        resourceType: "Group";
        created: string;
        lastModified: string;
        location: string;
        version?: string;
    };
    members: ScimGroupMember[];
}

interface ScimGroupPatchOperation {
    op: "replace" | "Replace" | "add" | "Add" | "remove" | "Remove";
    path?: "displayName" | "members";
    value: any;
}

interface ScimGroupPatch {
    schemas: string[];
    Operations: ScimGroupPatchOperation[];
}

interface ScimOrg {
    users: ScimUser[];
    groups: ScimGroup[];
}

interface ScimError {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"];
    status: number;
    scimType?: string;
    detail: string;
}

interface ScimListResponse {
    // NOTE: This isn't part of the RFC spec, but Azure fails without it
    id: string;
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"];
    totalResults: number;
    Resources: (ScimGroup | ScimUser)[];
    startIndex: 1;
    itemsPerPage: 20;
}

export class ScimServer implements DirectoryProvider {
    private _subscribers: DirectorySubscriber[] = [];

    constructor(public readonly config: ScimServerConfig, public readonly storage: Storage) {}

    subscribe(sub: DirectorySubscriber) {
        this._subscribers.push(sub);
    }

    async init() {
        await this._startScimServer();
    }

    private async _getScimOrg(orgId: OrgID) {
        const prov = await this.storage.get(OrgProvisioning, orgId);
        return (prov.metaData?.scim || { users: [], groups: [] }) as ScimOrg;
    }

    private async _saveScimOrg(orgId: OrgID, scimOrg: ScimOrg) {
        const prov = await this.storage.get(OrgProvisioning, orgId);
        prov.metaData = prov.metaData || {};
        prov.metaData.scim = scimOrg;
        await this.storage.save(prov);
    }

    private _toDirectoryUser(user: ScimUser): DirectoryUser {
        return {
            email: this._getScimUserEmail(user),
            name: user.name?.formatted,
            active: user.active,
            externalId: user.externalId,
        };
    }

    private _toDirectoryGroup(org: ScimOrg, group: ScimGroup): DirectoryGroup {
        const members = [];
        for (const { value } of group.members || []) {
            const user = org.users.find((user) => user.id === value);
            if (user) {
                members.push(this._toDirectoryUser(user));
            }
        }
        return {
            name: group.displayName,
            members,
        };
    }

    private _getScimUserEmail(user: ScimUser) {
        if (!Array.isArray(user.emails) || user.emails?.length === 0) {
            // Azure AD tends to use userName as email
            if (user.userName?.includes("@")) {
                return user.userName;
            }

            return "";
        }

        const primaryEmail = user.emails.find((email) => email.primary)?.value;
        const workEmail = user.emails.find((email) => email.type === "work")?.value;
        const firstEmail = user.emails[0].value;

        return primaryEmail || workEmail || firstEmail;
    }

    private _validateScimUser(user: ScimUser) {
        // TODO: Remove this
        console.log(JSON.stringify({ user }, null, 2));

        if (!this._getScimUserEmail(user)) {
            return "User must contain email";
        }

        if (!user.name?.formatted) {
            return "User must contain name.formatted";
        }

        return null;
    }

    private _validateScimUserPatchData(patchData: ScimUserPatch) {
        if (!Array.isArray(patchData.Operations) || patchData.Operations.length === 0) {
            return "No operations detected";
        }

        if (patchData.Operations.some((operation) => operation.op.toLowerCase() !== "replace")) {
            return "Only replace operations are supported";
        }

        return null;
    }

    private _validateScimGroup(group: ScimGroup) {
        // TODO: Remove this
        console.log(JSON.stringify({ group }, null, 2));

        if (!group.displayName) {
            return "Group must contain displayName";
        }

        return null;
    }

    private _validateScimGroupPatchData(patchData: ScimGroupPatch) {
        // TODO: Remove this
        console.log(JSON.stringify({ patchData }, null, 2));

        if (!Array.isArray(patchData.Operations) || patchData.Operations.length === 0) {
            return "No operations detected";
        }

        for (const operation of patchData.Operations) {
            if (
                operation.op.toLowerCase() === "replace" &&
                ((operation.path && operation.path !== "displayName") ||
                    (!operation.path && !operation.value.displayName))
            ) {
                return "Replace operations are only supported for displayName";
            }

            if (
                (operation.op.toLowerCase() === "add" || operation.op.toLowerCase() === "remove") &&
                ((operation.path && operation.path !== "members") || (!operation.path && !operation.value.members))
            ) {
                return "Add and Remove operations are only supported for members";
            }
        }

        return null;
    }

    private _getDataFromScimRequest(httpReq: IncomingMessage) {
        const url = new URL(`http://localhost${httpReq.url || ""}`);
        const secretToken =
            url.searchParams.get("token") || httpReq.headers.authorization?.replace("Bearer ", "") || "";
        const orgId = url.pathname.split("/")[1];
        const filter = decodeURIComponent(url.searchParams.get("filter") || "").replace(/\+/g, " ");

        const objectIdMatches = url.pathname.match(/^\/(?:[^\/]+)\/(?:Users|Groups)\/([^\/?#]+)/);

        let objectId = (objectIdMatches && objectIdMatches[1]) || "";

        return {
            secretToken,
            orgId,
            objectId,
            filter,
        };
    }

    private async _handleScimUsersPost(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let newUser: ScimUser;

        const { secretToken, orgId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId) {
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 400,
                detail: "Empty SCIM Secret Token / Org Id",
            };
            httpRes.statusCode = 400;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }

        try {
            const body = await readBody(httpReq);
            newUser = JSON.parse(body);
        } catch (e) {
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 400,
                detail: "Failed to read request body.",
            };
            httpRes.statusCode = 400;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }

        const validationError = this._validateScimUser(newUser);
        if (validationError) {
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 400,
                detail: validationError,
            };
            httpRes.statusCode = 400;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 400,
                    detail: "SCIM has not been configured for this org.",
                };
                httpRes.statusCode = 400;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
                return;
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 401,
                    detail: "Invalid SCIM Secret Token",
                };
                httpRes.statusCode = 401;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
                return;
            }

            const scimOrg = await this._getScimOrg(org.id);
            const email = this._getScimUserEmail(newUser);

            if (scimOrg.users.some((user) => this._getScimUserEmail(user) === email)) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 409,
                    detail: "A user with this email already exists!",
                };
                httpRes.statusCode = 409;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
                return;
            }

            // Force just the standard core schema
            newUser.schemas = ["urn:ietf:params:scim:schemas:core:2.0:User"];
            newUser.id = await uuid();
            newUser.meta = {
                resourceType: "User",
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                location: this._getUserRef(org, newUser),
            };
            scimOrg.users.push(newUser);

            for (const handler of this._subscribers) {
                await handler.userCreated(
                    {
                        email,
                        name: newUser.name.formatted,
                        active: newUser.active,
                    },
                    org.id
                );
            }

            await this._saveScimOrg(orgId, scimOrg);

            httpRes.statusCode = 201;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(newUser, null, 2));
            return;
        } catch (error) {
            console.error(error);
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 500,
                detail: "Unexpected error",
            };
            httpRes.statusCode = 500;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }
    }

    private async _handleScimUsersPatch(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let patchData: ScimUserPatch;

        const { secretToken, orgId, objectId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId || !objectId) {
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 400,
                detail: "Empty SCIM Secret Token / Org Id / User Id",
            };
            httpRes.statusCode = 400;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }

        try {
            const body = await readBody(httpReq);
            patchData = JSON.parse(body);
        } catch (e) {
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 400,
                detail: "Failed to read request body.",
            };
            httpRes.statusCode = 400;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }

        const validationError = this._validateScimUserPatchData(patchData);
        if (validationError) {
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 400,
                detail: validationError,
            };
            httpRes.statusCode = 400;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 400,
                    detail: "SCIM has not been configured for this org.",
                };
                httpRes.statusCode = 400;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
                return;
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 401,
                    detail: "Invalid SCIM Secret Token",
                };
                httpRes.statusCode = 401;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
            }

            const scimOrg = await this._getScimOrg(orgId);
            const userToUpdate = scimOrg.users.find((user) => user.id === objectId);

            if (!userToUpdate) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 404,
                    detail: "A user with this id does not exist!",
                };
                httpRes.statusCode = 404;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
                return;
            }

            for (const operation of patchData.Operations) {
                if (operation.path) {
                    setPath(userToUpdate, operation.path, operation.value);
                } else {
                    for (const path of Object.keys(operation.value)) {
                        setPath(userToUpdate, (path as ScimUserPatchOperation["path"])!, operation.value[path]);
                    }
                }
            }

            for (const handler of this._subscribers) {
                await handler.userUpdated(this._toDirectoryUser(userToUpdate), org.id);
            }

            userToUpdate.meta.lastModified = new Date().toISOString();

            await this._saveScimOrg(orgId, scimOrg);

            httpRes.statusCode = 200;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(userToUpdate, null, 2));
            return;
        } catch (error) {
            console.error(error);
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 500,
                detail: "Unexpected error",
            };
            httpRes.statusCode = 500;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }
    }

    private async _handleScimUsersDelete(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const { secretToken, orgId, objectId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId || !objectId) {
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 400,
                detail: "Empty SCIM Secret Token / Org Id / User Id",
            };
            httpRes.statusCode = 400;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 400,
                    detail: "SCIM has not been configured for this org.",
                };
                httpRes.statusCode = 400;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
                return;
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 401,
                    detail: "Invalid SCIM Secret Token",
                };
                httpRes.statusCode = 401;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
            }

            const scimOrg = await this._getScimOrg(orgId);

            const existingUser = scimOrg.users.find((user) => user.id === objectId);

            if (!existingUser) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 404,
                    detail: "A user with this id does not exist!",
                };
                httpRes.statusCode = 404;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
                return;
            }

            for (const handler of this._subscribers) {
                await handler.userDeleted(this._toDirectoryUser(existingUser), orgId);
            }

            const existingUserIndex = scimOrg.users.findIndex((user) => user.id === objectId);
            scimOrg.users.splice(existingUserIndex, 1);

            await this._saveScimOrg(orgId, scimOrg);
        } catch (error) {
            console.error(error);
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 500,
                detail: "Unexpected error",
            };
            httpRes.statusCode = 500;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }

        httpRes.statusCode = 204;
        httpRes.end();
    }

    private async _handleScimGroupsPost(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let newGroup: ScimGroup;

        const { secretToken, orgId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId) {
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 400,
                detail: "Empty SCIM Secret Token / Org Id",
            };
            httpRes.statusCode = 400;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }

        try {
            const body = await readBody(httpReq);
            newGroup = JSON.parse(body);
        } catch (e) {
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 400,
                detail: "Failed to read request body.",
            };
            httpRes.statusCode = 400;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }

        const validationError = this._validateScimGroup(newGroup);
        if (validationError) {
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 400,
                detail: validationError,
            };
            httpRes.statusCode = 400;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 400,
                    detail: "SCIM has not been configured for this org.",
                };
                httpRes.statusCode = 400;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
                return;
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 401,
                    detail: "Invalid SCIM Secret Token",
                };
                httpRes.statusCode = 401;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
            }

            const scimOrg = await this._getScimOrg(orgId);
            if (scimOrg.groups.some((group) => group.displayName === newGroup.displayName)) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 409,
                    detail: "Groups must have unique display names!",
                };
                httpRes.statusCode = 409;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
                return;
            }

            // Force just the standard core schema
            newGroup.schemas = ["urn:ietf:params:scim:schemas:core:2.0:Group"];
            newGroup.id = await uuid();
            newGroup.meta = {
                resourceType: "Group",
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                location: this._getGroupRef(org, newGroup),
            };
            newGroup.members = [];
            scimOrg.groups.push(newGroup);

            for (const handler of this._subscribers) {
                await handler.groupCreated(this._toDirectoryGroup(scimOrg, newGroup), org.id);
            }

            await this._saveScimOrg(orgId, scimOrg);

            httpRes.statusCode = 201;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(newGroup, null, 2));
            return;
        } catch (error) {
            console.error(error);
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 500,
                detail: "Unexpected error",
            };
            httpRes.statusCode = 500;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }
    }

    private async _handleScimGroupsPatch(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let patchData: ScimGroupPatch;

        const { secretToken, orgId, objectId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId || !objectId) {
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 400,
                detail: "Empty SCIM Secret Token / Org Id / Group Id",
            };
            httpRes.statusCode = 400;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }

        try {
            const body = await readBody(httpReq);
            patchData = JSON.parse(body);
        } catch (e) {
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 400,
                detail: "Failed to read request body.",
            };
            httpRes.statusCode = 400;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }

        const validationError = this._validateScimGroupPatchData(patchData);
        if (validationError) {
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 400,
                detail: validationError,
            };
            httpRes.statusCode = 400;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 400,
                    detail: "SCIM has not been configured for this org.",
                };
                httpRes.statusCode = 400;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
                return;
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 401,
                    detail: "Invalid SCIM Secret Token",
                };
                httpRes.statusCode = 401;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
            }

            const scimOrg = await this._getScimOrg(orgId);
            const existingGroup = scimOrg.groups.find((group) => group.id === objectId);

            if (!existingGroup) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 404,
                    detail: "A group with this id does not exist!",
                };
                httpRes.statusCode = 404;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
                return;
            }

            const previousName = existingGroup.displayName;

            for (const operation of patchData.Operations) {
                if (operation.path) {
                    this._updateGroupAtPath(org, scimOrg, existingGroup, operation.op, operation.path, operation.value);
                } else {
                    for (const path of Object.keys(operation.value)) {
                        this._updateGroupAtPath(
                            org,
                            scimOrg,
                            existingGroup,
                            operation.op,
                            path as ScimGroupPatchOperation["path"],
                            operation.value[path]
                        );
                    }
                }
            }

            existingGroup.meta.lastModified = new Date().toISOString();

            for (const handler of this._subscribers) {
                await handler.groupUpdated(
                    this._toDirectoryGroup(scimOrg, existingGroup),
                    org.id,
                    previousName !== existingGroup.displayName ? previousName : undefined
                );
            }

            await this._saveScimOrg(orgId, scimOrg);

            httpRes.statusCode = 200;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(existingGroup, null, 2));
            return;
        } catch (error) {
            console.error(error);
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 500,
                detail: "Unexpected error",
            };
            httpRes.statusCode = 500;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }
    }

    private async _handleScimGroupsDelete(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const { secretToken, orgId, objectId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId || !objectId) {
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 400,
                detail: "Empty SCIM Secret Token / Org Id / Group Id",
            };
            httpRes.statusCode = 400;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 400,
                    detail: "SCIM has not been configured for this org.",
                };
                httpRes.statusCode = 400;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
                return;
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 401,
                    detail: "Invalid SCIM Secret Token",
                };
                httpRes.statusCode = 401;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
            }

            const scimOrg = await this._getScimOrg(orgId);
            const existingGroup = scimOrg.groups.find((group) => group.id === objectId);

            if (!existingGroup) {
                const scimError: ScimError = {
                    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                    status: 404,
                    detail: "A group with this id does not exist!",
                };
                httpRes.statusCode = 404;
                httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
                httpRes.end(JSON.stringify(scimError, null, 2));
                return;
            }

            for (const handler of this._subscribers) {
                await handler.groupDeleted(this._toDirectoryGroup(scimOrg, existingGroup), orgId);
            }

            const existingGroupIndex = scimOrg.groups.findIndex((group) => group.id === objectId);
            scimOrg.groups.splice(existingGroupIndex, 1);

            await this._saveScimOrg(orgId, scimOrg);
        } catch (error) {
            console.error(error);
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 500,
                detail: "Unexpected error",
            };
            httpRes.statusCode = 500;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }

        httpRes.statusCode = 204;
        httpRes.end();
    }

    private async _handleScimGet(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const { secretToken, orgId, objectId, filter } = this._getDataFromScimRequest(httpReq);
        const [queryField, queryOperator, ...queryParts] = filter?.split(" ") || [];
        const queryValue = queryParts.join(" ");

        if (!secretToken || !orgId) {
            const scimError: ScimError = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
                status: 400,
                detail: "Empty SCIM Secret Token / Org Id",
            };
            httpRes.statusCode = 400;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimError, null, 2));
            return;
        }

        const listResponse: ScimListResponse = {
            id: await uuid(),
            schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
            totalResults: 0,
            Resources: [],
            startIndex: 1,
            itemsPerPage: 20,
        };

        if (objectId || filter) {
            const scimOrg = await this._getScimOrg(orgId);

            const url = new URL(`http://localhost${httpReq.url || ""}`);
            if (url.pathname.includes("/Groups")) {
                const scimGroup = scimOrg.groups.find((group) => {
                    if (objectId) {
                        return group.id === objectId;
                    }

                    if (queryField === "displayName" && queryOperator === "eq") {
                        return group.displayName === queryValue.replace(/"/g, "");
                    }

                    return false;
                });
                if (scimGroup) {
                    listResponse.Resources.push(scimGroup);
                    listResponse.totalResults = 1;
                }
            } else if (url.pathname.includes("/Users")) {
                const scimUser = scimOrg.users.find((user) => {
                    if (objectId) {
                        return user.id === objectId;
                    }

                    if (queryField === "userName" && queryOperator === "eq") {
                        return user.userName === queryValue.replace(/"/g, "");
                    }

                    return false;
                });
                if (scimUser) {
                    listResponse.Resources.push(scimUser);
                    listResponse.totalResults = 1;
                }
            }
        }

        // TODO: Remove this
        console.log(
            JSON.stringify({ listResponse, objectId, orgId, filter, queryField, queryOperator, queryValue }, null, 2)
        );

        httpRes.statusCode = 200;
        httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
        httpRes.end(JSON.stringify(listResponse, null, 2));
        return;
    }

    private _handleScimPost(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const url = new URL(`http://localhost${httpReq.url || ""}`);
        if (url.pathname.includes("/Groups")) {
            return this._handleScimGroupsPost(httpReq, httpRes);
        } else if (url.pathname.includes("/Users")) {
            return this._handleScimUsersPost(httpReq, httpRes);
        }

        httpRes.statusCode = 404;
        httpRes.end();
    }

    private _handleScimPatch(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const url = new URL(`http://localhost${httpReq.url || ""}`);
        if (url.pathname.includes("/Groups")) {
            return this._handleScimGroupsPatch(httpReq, httpRes);
        } else if (url.pathname.includes("/Users")) {
            return this._handleScimUsersPatch(httpReq, httpRes);
        }

        httpRes.statusCode = 404;
        httpRes.end();
    }

    private _handleScimDelete(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const url = new URL(`http://localhost${httpReq.url || ""}`);
        if (url.pathname.includes("/Groups")) {
            return this._handleScimGroupsDelete(httpReq, httpRes);
        } else if (url.pathname.includes("/Users")) {
            return this._handleScimUsersDelete(httpReq, httpRes);
        }

        httpRes.statusCode = 404;
        httpRes.end();
    }

    private async _handleScimRequest(httpReq: IncomingMessage, httpRes: ServerResponse) {
        // TODO: Remove this
        console.log(JSON.stringify({ method: httpReq.method, url: httpReq.url, headers: httpReq.headers }, null, 2));

        switch (httpReq.method) {
            case "GET":
                return this._handleScimGet(httpReq, httpRes);
            case "POST":
                return this._handleScimPost(httpReq, httpRes);
            case "PATCH":
                return this._handleScimPatch(httpReq, httpRes);
            case "DELETE":
                return this._handleScimDelete(httpReq, httpRes);
            case "PUST":
                httpRes.statusCode = 405;
                httpRes.end();
            default:
                httpRes.statusCode = 405;
                httpRes.end();
        }
    }

    private async _startScimServer() {
        console.log(`Starting SCIM server on port ${this.config.port}`);
        const server = createServer((req, res) => this._handleScimRequest(req, res));
        server.listen(this.config.port);
    }

    private _getUserRef(org: Org, user: ScimUser) {
        return org.directory.scim!.usersUrl.replace("/Users", `/Users/${user.id}`);
    }

    private _getGroupRef(org: Org, group: ScimGroup) {
        return org.directory.scim!.groupsUrl.replace("/Groups", `/Groups/${group.id}`);
    }

    private _updateGroupAtPath(
        org: Org,
        scimOrg: ScimOrg,
        group: ScimGroup,
        operation: ScimGroupPatchOperation["op"],
        scimPath: ScimGroupPatchOperation["path"],
        value: any
    ) {
        switch (scimPath) {
            case "displayName":
                group.displayName = value;
                break;
            case "members":
                for (const { value: memberId } of value) {
                    if (!group.members) {
                        group.members = [];
                    }

                    if (operation.toLowerCase() === "add") {
                        const user = scimOrg.users.find((user) => user.id === memberId);
                        if (user && !group.members.some((member) => member.value === memberId)) {
                            group.members.push({
                                value: memberId,
                                display: user.displayName,
                                $ref: this._getUserRef(org, user),
                            });
                        }
                    } else if (operation.toLowerCase() === "remove") {
                        group.members = group.members.filter((member) => member.value !== memberId);
                    }
                }
                break;
            default:
            // Ignore all other paths, we don't care about them
        }
    }
}
