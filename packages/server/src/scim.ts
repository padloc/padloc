import { Storage } from "@padloc/core/src/storage";
import { Config, ConfigParam } from "@padloc/core/src/config";
import { Org, Group, OrgMember } from "@padloc/core/src/org";
import { DirectoryProvider, DirectorySubscriber, DirectoryUser } from "@padloc/core/src/directory";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { getCryptoProvider } from "@padloc/core/src/platform";
import { base64ToBytes, stringToBase64, base64ToString } from "@padloc/core/src/encoding";
import { getIdFromEmail } from "@padloc/core/src/util";
import { readBody } from "./transport/http";

export class ScimServerConfig extends Config {
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
    schemas: string[];
    externalId?: string;
    userName?: string;
    active?: boolean;
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
    schemas: string[];
    Operations: ScimUserPatchOperation[];
}

interface ScimGroup {
    id?: string;
    schemas: string[];
    externalId?: string;
    displayName: string;
    meta: {
        resourceType: "Group";
    };
}

// TODO: Group membership updates ( https://docs.microsoft.com/en-us/azure/active-directory/app-provisioning/use-scim-to-provision-users-and-groups#update-group-add-members )

export class ScimServer implements DirectoryProvider {
    private _subscribers: DirectorySubscriber[] = [];

    constructor(public readonly config: ScimServerConfig, public readonly storage: Storage) {}

    subscribe(sub: DirectorySubscriber) {
        this._subscribers.push(sub);
    }

    async init() {
        await this._startScimServer();
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

        if (!user.name.formatted) {
            return "User must contain name.formatted";
        }

        if (user.meta.resourceType !== "User") {
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

        if (group.meta.resourceType !== "Group") {
            return 'Group meta.resourceType must be "Group"';
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

            let createdUser: OrgMember | null = null;

            for (const handler of this._subscribers) {
                const newlyCreatedUser = await handler.userCreated(
                    {
                        externalId: newUser.externalId,
                        email: this._getScimUserEmail(newUser),
                        name: newUser.name.formatted,
                        active: newUser.active,
                    },
                    org.id
                );

                if (newlyCreatedUser && !createdUser) {
                    createdUser = newlyCreatedUser;
                }
            }

            if (!createdUser) {
                throw new Error("Could not create user");
            }

            const scimUserResponse: ScimUser = {
                id: createdUser.accountId || createdUser.id || (await getIdFromEmail(createdUser.email)),
                schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
                externalId: newUser.externalId,
                name: {
                    formatted: createdUser.name,
                },
                userName: newUser.userName,
                displayName: createdUser.name,
                meta: {
                    resourceType: "User",
                },
            };

            httpRes.statusCode = 201;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimUserResponse, null, 2));
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

            let updatedUser: OrgMember | null = null;
            let userToUpdate: DirectoryUser = {};

            for (const operation of patchData.Operations) {
                if (operation.path) {
                    this._updateUserAtPath(userToUpdate, operation.path, operation.value);
                } else {
                    for (const path of Object.keys(operation.value)) {
                        this._updateUserAtPath(userToUpdate, path, operation.value[path]);
                    }
                }
            }

            for (const handler of this._subscribers) {
                const newlyUpdatedUser = await handler.userUpdated(userToUpdate, org.id, objectId);

                if (newlyUpdatedUser && !updatedUser) {
                    updatedUser = newlyUpdatedUser;
                }
            }

            if (!updatedUser) {
                throw new Error("Could not update user");
            }

            const scimUserResponse: ScimUser = {
                id: updatedUser.accountId || updatedUser.id || (await getIdFromEmail(updatedUser.email)),
                schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
                name: {
                    formatted: updatedUser.name,
                },
                displayName: updatedUser.name,
                meta: {
                    resourceType: "User",
                },
            };

            httpRes.statusCode = 200;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimUserResponse, null, 2));
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

            for (const handler of this._subscribers) {
                await handler.userDeleted(
                    {
                        name: "doesnotmatter",
                        email: "doesnotmatter",
                    },
                    org.id,
                    objectId
                );
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

            let createdGroup: Group | null = null;

            for (const handler of this._subscribers) {
                const newlyCreatedGroup = await handler.groupCreated(
                    {
                        externalId: newGroup.externalId,
                        name: newGroup.displayName,
                        members: [],
                    },
                    org.id
                );

                if (newlyCreatedGroup && !createdGroup) {
                    createdGroup = newlyCreatedGroup;
                }
            }

            if (!createdGroup) {
                throw new Error("Could not create group");
            }

            const scimGroupResponse: ScimGroup = {
                id: stringToBase64(createdGroup.name),
                schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"],
                externalId: newGroup.externalId,
                displayName: createdGroup.name,
                meta: {
                    resourceType: "Group",
                },
            };

            httpRes.statusCode = 201;
            httpRes.setHeader("Content-Type", "application/json; charset=utf-8");
            httpRes.end(JSON.stringify(scimGroupResponse, null, 2));
            return;
        } catch (error) {
            console.error(error);
            httpRes.statusCode = 500;
            httpRes.end("Unexpected Error");
            return;
        }
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
            // TODO: Implement this
            // return this.handleScimGroupsPatch(httpReq, httpRes);
        } else if (url.pathname.startsWith("/Users/")) {
            return this._handleScimUsersPatch(httpReq, httpRes);
        }

        httpRes.statusCode = 404;
        httpRes.end();
    }

    private _handleScimDelete(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const url = new URL(`http://localhost${httpReq.url || ""}`);
        if (url.pathname.startsWith("/Groups/")) {
            // TODO: Implement this
            // return this.handleScimGroupsDelete(httpReq, httpRes);
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

    private _updateUserAtPath(user: DirectoryUser, scimPath: any, value: any) {
        switch (scimPath) {
            case "name.formatted":
                user.name = value;
                break;
            case "name":
                user.name = value.formatted;
                break;
            case "emails":
                user.email = value.value;
                break;
            default:
            // Ignore all other paths, we don't care about them
        }
    }
}
