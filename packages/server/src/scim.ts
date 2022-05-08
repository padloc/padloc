import { Storage } from "@padloc/core/src/storage";
import { Config, ConfigParam } from "@padloc/core/src/config";
import { Org, OrgID } from "@padloc/core/src/org";
import { DirectoryProvider, DirectorySubscriber, DirectoryUser, DirectoryGroup } from "@padloc/core/src/directory";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { getCryptoProvider } from "@padloc/core/src/platform";
import { base64ToBytes, base64ToString } from "@padloc/core/src/encoding";
import { setPath, uuid } from "@padloc/core/src/util";
import { readBody } from "./transport/http";
import { OrgProvisioning } from "@padloc/core/src/provisioning";

export class ScimServerConfig extends Config {
    @ConfigParam()
    url: string = "";
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
    schemas:
        | ["urn:ietf:params:scim:schemas:core:2.0:User"]
        | ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"];
    externalId?: string;
    userName?: string;
    active: boolean;
    meta: {
        resourceType: "User";
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
        for (const { value } of group.members) {
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
            return "";
        }

        const primaryEmail = user.emails.find((email) => email.primary)?.value;
        const workEmail = user.emails.find((email) => email.type === "work")?.value;
        const firstEmail = user.emails[0].value;

        return primaryEmail || workEmail || firstEmail;
    }

    private _validateScimUser(user: ScimUser) {
        if (!this._getScimUserEmail(user)) {
            return "User must contain email";
        }

        if (!user.name?.formatted) {
            return "User must contain name.formatted";
        }

        if (user.meta?.resourceType !== "User") {
            return 'User meta.resourceType must be "User"';
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
        if (!group.displayName) {
            return "Group must contain displayName";
        }

        if (group.meta?.resourceType !== "Group") {
            return 'Group meta.resourceType must be "Group"';
        }

        return null;
    }

    private _validateScimGroupPatchData(patchData: ScimGroupPatch) {
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
        const secretToken = url.searchParams.get("token") || "";
        const orgId = url.searchParams.get("org") || "";

        const objectIdMatches = url.pathname.match(/^\/(?:Users|Groups)\/([^\/?#]+)/);

        let objectId = (objectIdMatches && objectIdMatches[1]) || "";

        // The id of groups is their name, so we base64 encode it, and need to decode here
        if (url.pathname.startsWith("/Groups")) {
            objectId = base64ToString(objectId);
        }

        return {
            secretToken,
            orgId,
            objectId,
        };
    }

    private async _handleScimUsersPost(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let newUser: ScimUser;

        const { secretToken, orgId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId) {
            httpRes.statusCode = 400;
            httpRes.end("Empty SCIM Secret Token / Org Id");
            return;
        }

        try {
            const body = await readBody(httpReq);
            newUser = JSON.parse(body);
        } catch (e) {
            httpRes.statusCode = 400;
            httpRes.end("Failed to read request body.");
            return;
        }

        const validationError = this._validateScimUser(newUser);
        if (validationError) {
            httpRes.statusCode = 400;
            httpRes.end(validationError);
            return;
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                httpRes.statusCode = 400;
                httpRes.end("SCIM has not been configured for this org.");
                return;
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                httpRes.statusCode = 401;
                httpRes.end("Invalid SCIM Secret Token");
                return;
            }

            const scimOrg = await this._getScimOrg(org.id);
            const email = this._getScimUserEmail(newUser);

            if (scimOrg.users.some((user) => this._getScimUserEmail(user) === email)) {
                httpRes.statusCode = 409;
                // TODO: Return proper scim error (See https://datatracker.ietf.org/doc/html/rfc7644#section-3.12)
                httpRes.end("A user with this email already exists!");
            }

            newUser.id = await uuid();
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
            httpRes.statusCode = 500;
            httpRes.end("Unexpected Error");
            return;
        }
    }

    private async _handleScimUsersPatch(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let patchData: ScimUserPatch;

        const { secretToken, orgId, objectId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId || !objectId) {
            httpRes.statusCode = 400;
            httpRes.end("Empty SCIM Secret Token / Org Id / User Id");
            return;
        }

        try {
            const body = await readBody(httpReq);
            patchData = JSON.parse(body);
        } catch (e) {
            httpRes.statusCode = 400;
            httpRes.end("Failed to read request body.");
            return;
        }

        const validationError = this._validateScimUserPatchData(patchData);
        if (validationError) {
            httpRes.statusCode = 400;
            httpRes.end(validationError);
            return;
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                httpRes.statusCode = 400;
                httpRes.end("SCIM has not been configured for this org.");
                return;
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                httpRes.statusCode = 401;
                httpRes.end("Invalid SCIM Secret Token");
                return;
            }

            const scimOrg = await this._getScimOrg(orgId);
            const userToUpdate = scimOrg.users.find((user) => user.id === objectId);

            if (!userToUpdate) {
                httpRes.statusCode = 404;
                // TODO: Return proper scim error (See https://datatracker.ietf.org/doc/html/rfc7644#section-3.12)
                httpRes.end("A user with this id does not exist!");
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

            await this._saveScimOrg(orgId, scimOrg);

            httpRes.statusCode = 200;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(userToUpdate, null, 2));
            return;
        } catch (error) {
            console.error(error);
            httpRes.statusCode = 500;
            httpRes.end("Unexpected Error");
            return;
        }
    }

    private async _handleScimUsersDelete(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const { secretToken, orgId, objectId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId || !objectId) {
            httpRes.statusCode = 400;
            httpRes.end("Empty SCIM Secret Token / Org Id / User Id");
            return;
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                httpRes.statusCode = 400;
                httpRes.end("SCIM has not been configured for this org.");
                return;
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                httpRes.statusCode = 401;
                httpRes.end("Invalid SCIM Secret Token");
                return;
            }

            const scimOrg = await this._getScimOrg(orgId);

            const existingUser = scimOrg.users.find((user) => user.id === objectId);

            if (!existingUser) {
                httpRes.statusCode = 404;
                // TODO: Return proper scim error (See https://datatracker.ietf.org/doc/html/rfc7644#section-3.12)
                httpRes.end("A user with this id does not exist!");
                return;
            }

            for (const handler of this._subscribers) {
                await handler.userDeleted(this._toDirectoryUser(existingUser), orgId);
            }
        } catch (error) {
            console.error(error);
            httpRes.statusCode = 500;
            httpRes.end("Unexpected Error");
            return;
        }

        httpRes.statusCode = 204;
        httpRes.end();
    }

    private async _handleScimGroupsPost(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let newGroup: ScimGroup;

        const { secretToken, orgId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId) {
            httpRes.statusCode = 400;
            httpRes.end("Empty SCIM Secret Token / Org Id");
            return;
        }

        try {
            const body = await readBody(httpReq);
            newGroup = JSON.parse(body);
        } catch (e) {
            httpRes.statusCode = 400;
            httpRes.end("Failed to read request body.");
            return;
        }

        const validationError = this._validateScimGroup(newGroup);
        if (validationError) {
            httpRes.statusCode = 400;
            httpRes.end(validationError);
            return;
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                httpRes.statusCode = 400;
                httpRes.end("SCIM has not been configured for this org.");
                return;
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                httpRes.statusCode = 401;
                httpRes.end("Invalid SCIM Secret Token");
                return;
            }

            const scimOrg = await this._getScimOrg(orgId);
            if (scimOrg.groups.some((group) => group.displayName === newGroup.displayName)) {
                httpRes.statusCode = 409;
                // TODO: Return proper scim error (See https://datatracker.ietf.org/doc/html/rfc7644#section-3.12)
                httpRes.end("Groups must have unique display names!");
                return;
            }

            newGroup.id = await uuid();
            scimOrg.groups.push(newGroup);

            for (const handler of this._subscribers) {
                await handler.groupCreated(this._toDirectoryGroup(scimOrg, newGroup), org.id);
            }

            httpRes.statusCode = 201;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(newGroup, null, 2));
            return;
        } catch (error) {
            console.error(error);
            httpRes.statusCode = 500;
            httpRes.end("Unexpected Error");
            return;
        }
    }

    private async _handleScimGroupsPatch(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let patchData: ScimGroupPatch;

        const { secretToken, orgId, objectId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId || !objectId) {
            httpRes.statusCode = 400;
            httpRes.end("Empty SCIM Secret Token / Org Id / Group Id");
            return;
        }

        try {
            const body = await readBody(httpReq);
            patchData = JSON.parse(body);
        } catch (e) {
            httpRes.statusCode = 400;
            httpRes.end("Failed to read request body.");
            return;
        }

        const validationError = this._validateScimGroupPatchData(patchData);
        if (validationError) {
            httpRes.statusCode = 400;
            httpRes.end(validationError);
            return;
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                httpRes.statusCode = 400;
                httpRes.end("SCIM has not been configured for this org.");
                return;
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                httpRes.statusCode = 401;
                httpRes.end("Invalid SCIM Secret Token");
                return;
            }

            const scimOrg = await this._getScimOrg(orgId);
            const existingGroup = scimOrg.groups.find((group) => group.id === objectId);

            if (!existingGroup) {
                httpRes.statusCode = 404;
                // TODO: Return proper scim error (See https://datatracker.ietf.org/doc/html/rfc7644#section-3.12)
                httpRes.end("A group with this id does not exist!");
                return;
            }

            const previousName = existingGroup.displayName;

            for (const operation of patchData.Operations) {
                if (operation.path) {
                    this._updateGroupAtPath(scimOrg, existingGroup, operation.op, operation.path, operation.value);
                } else {
                    for (const path of Object.keys(operation.value)) {
                        this._updateGroupAtPath(
                            scimOrg,
                            existingGroup,
                            operation.op,
                            path as ScimGroupPatchOperation["path"],
                            operation.value[path]
                        );
                    }
                }
            }

            for (const handler of this._subscribers) {
                await handler.groupUpdated(
                    this._toDirectoryGroup(scimOrg, existingGroup),
                    org.id,
                    previousName !== existingGroup.displayName ? previousName : undefined
                );
            }

            httpRes.statusCode = 200;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(existingGroup, null, 2));
            return;
        } catch (error) {
            console.error(error);
            httpRes.statusCode = 500;
            httpRes.end("Unexpected Error");
            return;
        }
    }

    private async _handleScimGroupsDelete(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const { secretToken, orgId, objectId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId || !objectId) {
            httpRes.statusCode = 400;
            httpRes.end("Empty SCIM Secret Token / Org Id / Group Id");
            return;
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                httpRes.statusCode = 400;
                httpRes.end("SCIM has not been configured for this org.");
                return;
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                httpRes.statusCode = 401;
                httpRes.end("Invalid SCIM Secret Token");
                return;
            }

            const scimOrg = await this._getScimOrg(orgId);
            const existingGroup = scimOrg.groups.find((group) => group.id === objectId);

            if (!existingGroup) {
                httpRes.statusCode = 404;
                // TODO: Return proper scim error (See https://datatracker.ietf.org/doc/html/rfc7644#section-3.12)
                httpRes.end("A group with this id does not exist!");
                return;
            }

            for (const handler of this._subscribers) {
                await handler.groupDeleted(this._toDirectoryGroup(scimOrg, existingGroup), orgId);
            }
        } catch (error) {
            console.error(error);
            httpRes.statusCode = 500;
            httpRes.end("Unexpected Error");
            return;
        }

        httpRes.statusCode = 204;
        httpRes.end();
    }

    private _handleScimPost(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const url = new URL(`http://localhost${httpReq.url || ""}`);
        switch (url.pathname) {
            case "/Groups":
                return this._handleScimGroupsPost(httpReq, httpRes);
            case "/Users":
                return this._handleScimUsersPost(httpReq, httpRes);
            default:
                httpRes.statusCode = 404;
                httpRes.end();
        }
    }

    private _handleScimPatch(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const url = new URL(`http://localhost${httpReq.url || ""}`);
        if (url.pathname.startsWith("/Groups/")) {
            return this._handleScimGroupsPatch(httpReq, httpRes);
        } else if (url.pathname.startsWith("/Users/")) {
            return this._handleScimUsersPatch(httpReq, httpRes);
        }

        httpRes.statusCode = 404;
        httpRes.end();
    }

    private _handleScimDelete(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const url = new URL(`http://localhost${httpReq.url || ""}`);
        if (url.pathname.startsWith("/Groups/")) {
            return this._handleScimGroupsDelete(httpReq, httpRes);
        } else if (url.pathname.startsWith("/Users/")) {
            return this._handleScimUsersDelete(httpReq, httpRes);
        }

        httpRes.statusCode = 404;
        httpRes.end();
    }

    private async _handleScimRequest(httpReq: IncomingMessage, httpRes: ServerResponse) {
        switch (httpReq.method) {
            case "POST":
                return this._handleScimPost(httpReq, httpRes);
            case "PATCH":
                return this._handleScimPatch(httpReq, httpRes);
            case "DELETE":
                return this._handleScimDelete(httpReq, httpRes);
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

    private _getUserRef(user: ScimUser) {
        return `${this.config.url}/Users/${user.id}`;
    }

    // private _getGroupRef(group: ScimGroup) {
    //     return `${this.config.url}/Groups/${group.id}`;
    // }

    private _updateGroupAtPath(
        org: ScimOrg,
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
                if (operation.toLowerCase() === "add") {
                    const user = org.users.find((user) => user.id === value);
                    if (user && !group.members.some((u) => u.value === value)) {
                        group.members.push({ value, display: user.displayName, $ref: this._getUserRef(user) });
                    }
                } else if (operation.toLowerCase() === "remove") {
                    group.members = group.members.filter((m) => m.value !== value);
                }
                break;
            default:
            // Ignore all other paths, we don't care about them
        }
    }
}
