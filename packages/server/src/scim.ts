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
    startIndex: number;
    itemsPerPage: number;
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
        try {
            const prov = await this.storage.get(OrgProvisioning, orgId);
            return (prov.metaData?.scim || { users: [], groups: [] }) as ScimOrg;
        } catch (e) {
            return null;
        }
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

    private _sendResponse(httpRes: ServerResponse, status: number, data: Object) {
        httpRes.statusCode = status;
        httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
        httpRes.end(JSON.stringify(data, null, 2));
        return;
    }

    private _sendErrorResponse(httpRes: ServerResponse, status: number, detail: string) {
        const scimError: ScimError = {
            schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
            status,
            detail,
        };
        httpRes.statusCode = status;
        httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
        httpRes.end(JSON.stringify(scimError, null, 2));
    }

    private _getDataFromScimRequest(httpReq: IncomingMessage) {
        const url = new URL(`http://localhost${httpReq.url || ""}`);
        const basePath = new URL(this.config.url).pathname.replace(/\/$/, "");
        const secretToken =
            url.searchParams.get("token") || httpReq.headers.authorization?.replace("Bearer ", "") || "";
        const filter = decodeURIComponent(url.searchParams.get("filter") || "").replace(/\+/g, " ");

        const matchUrl = url.pathname.match(
            new RegExp(`${basePath}/(?<orgId>[^/]+)(?:/(?<resourceType>Users|Groups)(?:/(?<objectId>[^/?#]+))?)?`, "i")
        );

        const type = matchUrl?.groups?.resourceType?.toLowerCase();
        console.log("type", type);
        const resourceType = (type === "users" ? "User" : type === "groups" ? "Group" : undefined) as
            | "Group"
            | "User"
            | undefined;
        const orgId = matchUrl?.groups?.orgId;
        const objectId = matchUrl?.groups?.objectId;

        return {
            resourceType,
            secretToken,
            orgId,
            objectId,
            filter,
        };
    }

    private async _createScimUser(
        newUser: ScimUser,
        orgId: string,
        secretToken: string,
        httpRes: ServerResponse,
        isComingFromSaml = false
    ) {
        const validationError = this._validateScimUser(newUser);
        if (validationError) {
            return this._sendErrorResponse(httpRes, 400, validationError);
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                return this._sendErrorResponse(httpRes, 400, "SCIM has not been configured for this org.");
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                return this._sendErrorResponse(httpRes, 401, "Invalid SCIM Secret Token");
            }

            const scimOrg = await this._getScimOrg(org.id);
            if (!scimOrg) {
                return this._sendErrorResponse(httpRes, 404, "An organization with this id does not exist.");
            }

            const email = this._getScimUserEmail(newUser);

            if (scimOrg.users.some((user) => this._getScimUserEmail(user) === email)) {
                // Just skip this and don't error out for SAML if this user already exists
                if (isComingFromSaml) {
                    return;
                }

                return this._sendErrorResponse(httpRes, 409, "A user with this email already exists.");
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

            // SAML will redirect on success, so don't respond there
            if (!isComingFromSaml) {
                return this._sendResponse(httpRes, 201, newUser);
            }
        } catch (error) {
            return this._sendErrorResponse(httpRes, 500, "Unexpected Error");
        }
    }

    private async _handleScimUsersPost(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let newUser: ScimUser;

        const { secretToken, orgId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId) {
            return this._sendErrorResponse(httpRes, 400, "Empty SCIM Secret Token / Org Id");
        }

        try {
            const body = await readBody(httpReq);
            newUser = JSON.parse(body);
        } catch (e) {
            return this._sendErrorResponse(httpRes, 400, "Failed to read request body.");
        }

        return this._createScimUser(newUser, orgId, secretToken, httpRes);
    }

    private async _handleScimUsersPatch(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let patchData: ScimUserPatch;

        const { secretToken, orgId, objectId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId || !objectId) {
            return this._sendErrorResponse(httpRes, 400, "Empty SCIM Secret Token / Org Id / User Id");
        }

        try {
            const body = await readBody(httpReq);
            patchData = JSON.parse(body);
        } catch (e) {
            return this._sendErrorResponse(httpRes, 400, "Failed to read request body.");
        }

        const validationError = this._validateScimUserPatchData(patchData);
        if (validationError) {
            return this._sendErrorResponse(httpRes, 400, validationError);
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                return this._sendErrorResponse(httpRes, 400, "SCIM has not been configured for this org.");
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                return this._sendErrorResponse(httpRes, 401, "Invalid SCIM Secret Token");
            }

            const scimOrg = await this._getScimOrg(orgId);
            if (!scimOrg) {
                return this._sendErrorResponse(httpRes, 404, "An organization with this id does not exist.");
            }

            const userToUpdate = scimOrg.users.find((user) => user.id === objectId);

            if (!userToUpdate) {
                return this._sendErrorResponse(httpRes, 404, "A user with this id does not exist.");
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

            return this._sendResponse(httpRes, 200, userToUpdate);
        } catch (error) {
            console.error(error);
            return this._sendErrorResponse(httpRes, 500, "Unexpected Error");
        }
    }

    private async _handleScimUsersDelete(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const { secretToken, orgId, objectId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId || !objectId) {
            return this._sendErrorResponse(httpRes, 400, "Empty SCIM Secret Token / Org Id / User Id");
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                return this._sendErrorResponse(httpRes, 400, "SCIM has not been configured for this org.");
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                return this._sendErrorResponse(httpRes, 401, "Invalid SCIM Secret Token");
            }

            const scimOrg = await this._getScimOrg(orgId);
            if (!scimOrg) {
                return this._sendErrorResponse(httpRes, 404, "An organization with this id does not exist.");
            }

            const existingUser = scimOrg.users.find((user) => user.id === objectId);
            if (!existingUser) {
                return this._sendErrorResponse(httpRes, 404, "A user with this id does not exist!");
            }

            for (const handler of this._subscribers) {
                await handler.userDeleted(this._toDirectoryUser(existingUser), orgId);
            }

            const existingUserIndex = scimOrg.users.findIndex((user) => user.id === objectId);
            scimOrg.users.splice(existingUserIndex, 1);

            await this._saveScimOrg(orgId, scimOrg);
        } catch (error) {
            return this._sendErrorResponse(httpRes, 500, "Unexpected Error");
        }

        httpRes.statusCode = 204;
        httpRes.end();
    }

    private async _handleScimGroupsPost(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let newGroup: ScimGroup;

        const { secretToken, orgId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId) {
            return this._sendErrorResponse(httpRes, 400, "Empty SCIM Secret Token / Org Id");
        }

        try {
            const body = await readBody(httpReq);
            newGroup = JSON.parse(body);
        } catch (e) {
            return this._sendErrorResponse(httpRes, 400, "Failed to read request body.");
        }

        const validationError = this._validateScimGroup(newGroup);
        if (validationError) {
            return this._sendErrorResponse(httpRes, 400, validationError);
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                return this._sendErrorResponse(httpRes, 400, "SCIM has not been configured for this org.");
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                return this._sendErrorResponse(httpRes, 401, "Invalid SCIM Secret Token");
            }

            const scimOrg = await this._getScimOrg(orgId);
            if (!scimOrg) {
                return this._sendErrorResponse(httpRes, 404, "An organization with this id does not exist.");
            }
            if (scimOrg.groups.some((group) => group.displayName === newGroup.displayName)) {
                return this._sendErrorResponse(httpRes, 409, "Groups must have unique display names.");
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

            return this._sendResponse(httpRes, 201, newGroup);
        } catch (error) {
            console.error(error);
            return this._sendErrorResponse(httpRes, 500, "Unexpected Error");
        }
    }

    private async _handleScimGroupsPatch(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let patchData: ScimGroupPatch;

        const { secretToken, orgId, objectId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId || !objectId) {
            return this._sendErrorResponse(httpRes, 400, "Empty SCIM Secret Token / Org Id / Group Id");
        }

        try {
            const body = await readBody(httpReq);
            patchData = JSON.parse(body);
        } catch (e) {
            return this._sendErrorResponse(httpRes, 400, "Failed to read request body.");
        }

        const validationError = this._validateScimGroupPatchData(patchData);
        if (validationError) {
            return this._sendErrorResponse(httpRes, 400, validationError);
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                return this._sendErrorResponse(httpRes, 400, "SCIM has not been configured for this org.");
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                return this._sendErrorResponse(httpRes, 401, "Invalid SCIM Secret Token");
            }

            const scimOrg = await this._getScimOrg(orgId);
            if (!scimOrg) {
                return this._sendErrorResponse(httpRes, 404, "An organization with this id does not exist.");
            }

            const existingGroup = scimOrg.groups.find((group) => group.id === objectId);

            if (!existingGroup) {
                return this._sendErrorResponse(httpRes, 404, "A group with this id does not exist!");
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

            return this._sendResponse(httpRes, 200, existingGroup);
        } catch (error) {
            console.error(error);
            return this._sendErrorResponse(httpRes, 500, "Unexpected Error");
        }
    }

    private async _handleScimGroupsDelete(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const { secretToken, orgId, objectId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId || !objectId) {
            return this._sendErrorResponse(httpRes, 400, "Empty SCIM Secret Token / Org Id / Group Id");
        }

        try {
            const org = await this.storage.get(Org, orgId);

            if (!org.directory.scim) {
                return this._sendErrorResponse(httpRes, 400, "SCIM has not been configured for this org.");
            }

            const secretTokenMatches = await getCryptoProvider().timingSafeEqual(
                org.directory.scim.secret,
                base64ToBytes(secretToken)
            );

            if (!secretTokenMatches) {
                return this._sendErrorResponse(httpRes, 401, "Invalid SCIM Secret Token");
            }

            const scimOrg = await this._getScimOrg(orgId);
            if (!scimOrg) {
                return this._sendErrorResponse(httpRes, 404, "An organization with this id does not exist.");
            }

            const existingGroup = scimOrg.groups.find((group) => group.id === objectId);

            if (!existingGroup) {
                return this._sendErrorResponse(httpRes, 404, "A group with this id does not exist.");
            }

            for (const handler of this._subscribers) {
                await handler.groupDeleted(this._toDirectoryGroup(scimOrg, existingGroup), orgId);
            }

            const existingGroupIndex = scimOrg.groups.findIndex((group) => group.id === objectId);
            scimOrg.groups.splice(existingGroupIndex, 1);

            await this._saveScimOrg(orgId, scimOrg);
        } catch (error) {
            console.error(error);
            return this._sendErrorResponse(httpRes, 500, "Unexpected Error");
        }

        httpRes.statusCode = 204;
        httpRes.end();
    }

    private async _handleSamlPost(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let newUser: ScimUser;
        const { secretToken, orgId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId) {
            return this._sendErrorResponse(httpRes, 400, "Empty SCIM Secret Token / Org Id");
        }

        try {
            const body = await readBody(httpReq);
            const params = new URLSearchParams(body);
            const samlResponse = params.get("SAMLResponse") || "";
            const xmlSamlResponse = Buffer.from(samlResponse, "base64").toString("ascii");

            // TODO: Remove this
            console.log(JSON.stringify({ xmlSamlResponse }, null, 2));

            // NOTE: While this isn't super reliable, it makes it unnecessary to require _heavy_ (and generally security-vulnerability-filled) XML-parsing dependencies.
            const anyPropertyEnd = "</saml2:AttributeValue>";
            const emailPropertyStart = `<saml2:AttributeStatement><saml2:Attribute Name="email"><saml2:AttributeValue xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:anyType">`;
            const firstNamePropertyStart = `<saml2:Attribute Name="firstName"><saml2:AttributeValue xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:anyType">`;
            const lastNamePropertyStart = `<saml2:Attribute Name="lastName"><saml2:AttributeValue xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:anyType">`;

            const emailPropertyStartIndex = xmlSamlResponse.indexOf(emailPropertyStart);
            const firstNamePropertyStartIndex = xmlSamlResponse.indexOf(firstNamePropertyStart);
            const lastNamePropertyStartIndex = xmlSamlResponse.indexOf(lastNamePropertyStart);

            const emailPropertyEndIndex =
                emailPropertyStartIndex !== -1 ? xmlSamlResponse.indexOf(anyPropertyEnd, emailPropertyStartIndex) : -1;
            const firstNamePropertyEndIndex =
                firstNamePropertyStartIndex !== -1
                    ? xmlSamlResponse.indexOf(anyPropertyEnd, firstNamePropertyStartIndex)
                    : -1;
            const lastNamePropertyEndIndex =
                lastNamePropertyStartIndex !== -1
                    ? xmlSamlResponse.indexOf(anyPropertyEnd, lastNamePropertyStartIndex)
                    : -1;

            const email =
                emailPropertyStartIndex !== -1 && emailPropertyEndIndex !== -1
                    ? xmlSamlResponse.substring(
                          emailPropertyStartIndex + emailPropertyStart.length,
                          emailPropertyEndIndex
                      )
                    : "";
            const firstName =
                firstNamePropertyStartIndex !== -1 && firstNamePropertyEndIndex !== -1
                    ? xmlSamlResponse.substring(
                          firstNamePropertyStartIndex + firstNamePropertyStart.length,
                          firstNamePropertyEndIndex
                      )
                    : "";
            const lastName =
                lastNamePropertyStartIndex !== -1 && lastNamePropertyEndIndex !== -1
                    ? xmlSamlResponse.substring(
                          lastNamePropertyStartIndex + lastNamePropertyStart.length,
                          lastNamePropertyEndIndex
                      )
                    : "";

            newUser = {
                schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
                active: true,
                meta: {
                    resourceType: "User",
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    location: "string",
                },
                name: {
                    formatted: `${firstName} ${lastName}`,
                },
                emails: [
                    {
                        value: email,
                        type: "work",
                        primary: true,
                    },
                ],
            };
        } catch (e) {
            return this._sendErrorResponse(httpRes, 400, "Failed to read request body.");
        }

        // TODO: Remove this
        console.log(JSON.stringify({ newUser }, null, 2));

        this._createScimUser(newUser, orgId, secretToken, httpRes, true);

        httpRes.statusCode = 302;
        httpRes.setHeader("Location", "/");
        httpRes.end();
        return;
    }

    private async _handleScimGet(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const { resourceType, secretToken, orgId, objectId, filter } = this._getDataFromScimRequest(httpReq);
        const [queryField, queryOperator, ...queryParts] = filter?.split(" ") || [];
        const queryValue = queryParts.join(" ");

        if (!secretToken || !orgId) {
            return this._sendErrorResponse(httpRes, 400, "Empty SCIM Secret Token / Org Id");
        }

        const scimOrg = await this._getScimOrg(orgId);
        if (!scimOrg) {
            return this._sendErrorResponse(httpRes, 404, "An organization with this id does not exist.");
        }
        const listResponse: ScimListResponse = {
            id: await uuid(),
            schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
            totalResults: 0,
            Resources: [],
            startIndex: 1,
            itemsPerPage: 20,
        };

        if (!resourceType || resourceType === "Group") {
            const groups = scimOrg.groups.filter((group) => {
                if (objectId) {
                    return group.id === objectId;
                }

                if (queryField === "displayName" && queryOperator === "eq") {
                    return group.displayName === queryValue.replace(/"/g, "");
                }

                return true;
            });
            listResponse.Resources.push(...groups);
        }

        if (!resourceType || resourceType === "User") {
            const users = scimOrg.users.filter((user) => {
                if (objectId) {
                    return user.id === objectId;
                }

                if (queryField === "userName" && queryOperator === "eq") {
                    return user.userName === queryValue.replace(/"/g, "");
                }

                return true;
            });
            listResponse.Resources.push(...users);
        }

        // TODO: Add proper pagination
        listResponse.totalResults = listResponse.itemsPerPage = listResponse.Resources.length;

        // TODO: Remove this
        console.log(
            JSON.stringify({ listResponse, objectId, orgId, filter, queryField, queryOperator, queryValue }, null, 2)
        );

        return this._sendResponse(httpRes, 200, listResponse);
    }

    private _handleScimPost(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const url = new URL(`http://localhost${httpReq.url || ""}`);
        if (url.pathname.includes("/Groups")) {
            return this._handleScimGroupsPost(httpReq, httpRes);
        } else if (url.pathname.includes("/Users")) {
            return this._handleScimUsersPost(httpReq, httpRes);
        } else if (url.pathname.endsWith("/saml")) {
            // SAML/SSO bypass
            return this._handleSamlPost(httpReq, httpRes);
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
        return `${org.directory.scim!.url}/Users/${user.id}`;
    }

    private _getGroupRef(org: Org, group: ScimGroup) {
        return `${org.directory.scim!.url}/Groups/${group.id}`;
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
