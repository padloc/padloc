import { Storage } from "@padloc/core/src/storage";
import { Config, ConfigParam } from "@padloc/core/src/config";
import { Org, Group, OrgMember } from "@padloc/core/src/org";
import { DirectoryProvider, DirectorySubscriber } from "@padloc/core/src/directory";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { readBody } from "./transport/http";
import { getCryptoProvider } from "@padloc/core/src/platform";
import { base64ToBytes, stringToBase64, base64ToString } from "@padloc/core/src/encoding";

export class ScimServerConfig extends Config {
    @ConfigParam("number")
    port: number = 5000;
}

interface ScimUser {
    id?: string;
    schemas: string[];
    externalId?: string;
    userName: string;
    active?: boolean;
    meta: {
        resourceType: "User";
    };
    name: {
        formatted: string;
    };
    displayName?: string;
    emails?: {
        value: string;
        type: "work" | "home" | "other";
        primary?: boolean;
    }[];
}

// TODO: User property updates ( https://docs.microsoft.com/en-us/azure/active-directory/app-provisioning/use-scim-to-provision-users-and-groups#update-user-single-valued-properties )

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

        const objectId = (objectIdMatches && objectIdMatches[1] && base64ToString(objectIdMatches[1])) || "";

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
                id: stringToBase64(createdUser.accountId || createdUser.id || createdUser.email),
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
        let userToUpdate: ScimUser;

        const { secretToken, orgId, objectId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId || !objectId) {
            httpRes.statusCode = 400;
            httpRes.end("Empty SCIM Secret Token / Org Id / User Id");
            return;
        }

        // TODO: What's received is a list of operations, not the updated user ( https://datatracker.ietf.org/doc/html/rfc7644#section-3.5.2 )
        try {
            const body = await readBody(httpReq);
            userToUpdate = JSON.parse(body);
        } catch (e) {
            httpRes.statusCode = 400;
            httpRes.end("Failed to read request body.");
            return;
        }

        const validationError = this._validateScimUser(userToUpdate);
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

            for (const handler of this._subscribers) {
                const newlyUpdatedUser = await handler.userUpdated(
                    {
                        externalId: userToUpdate.externalId,
                        email: this._getScimUserEmail(userToUpdate),
                        name: userToUpdate.name.formatted,
                        active: userToUpdate.active,
                    },
                    org.id,
                    objectId
                );

                if (newlyUpdatedUser && !updatedUser) {
                    updatedUser = newlyUpdatedUser;
                }
            }

            if (!updatedUser) {
                throw new Error("Could not update user");
            }

            const scimUserResponse: ScimUser = {
                id: stringToBase64(updatedUser.accountId || updatedUser.id || updatedUser.email),
                schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
                externalId: userToUpdate.externalId,
                name: {
                    formatted: updatedUser.name,
                },
                userName: userToUpdate.userName,
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

    // TODO: This needs to match on a given id instead of just /User (/User/<id>)
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
}
