import { Storage } from "@padloc/core/src/storage";
import { Config, ConfigParam } from "@padloc/core/src/config";
import { Org } from "@padloc/core/src/org";
import { DirectoryProvider, DirectorySubscriber } from "@padloc/core/src/directory";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { readBody } from "./transport/http";
import { getCryptoProvider } from "@padloc/core/src/platform";
import { base64ToBytes } from "@padloc/core/src/encoding";

export class ScimServerConfig extends Config {
    @ConfigParam("number")
    port: number = 5000;
}

interface ScimUser {
    schemas: string[];
    externalId: string;
    userName: string;
    active: boolean;
    meta: {
        resourceType: "User";
    };
    name: {
        formatted: string;
    };
    // TODO: This isn't according to spec ( should be "emails": https://datatracker.ietf.org/doc/html/rfc7643 )
    email: string;
}

interface ScimGroup {
    schemas: string[];
    externalId: string;
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

    private _validateScimUser(user: ScimUser): string | null {
        if (!user.externalId) {
            return "User must contain externalId";
        }

        if (!user.email) {
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

    private _validateScimGroup(group: ScimGroup): string | null {
        if (!group.externalId) {
            return "Group must contain externalId";
        }

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

        return {
            secretToken,
            orgId,
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

            for (const handler of this._subscribers) {
                await handler.userCreated(
                    {
                        externalId: newUser.externalId,
                        email: newUser.email,
                        name: newUser.name.formatted,
                        active: newUser.active,
                    },
                    org.id
                );
            }
        } catch (error) {
            console.error(error);
            httpRes.statusCode = 500;
            httpRes.end("Unexpected Error");
            return;
        }

        // TODO: Return the created user, including ID

        httpRes.statusCode = 201;
        httpRes.end();
    }

    // TODO: This needs to match on a given id instead of just /Users (/Users/<id>)
    private async _handleScimUsersPatch(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let updatedUser: ScimUser;

        const { secretToken, orgId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId) {
            httpRes.statusCode = 400;
            httpRes.end("Empty SCIM Secret Token / Org Id");
            return;
        }

        try {
            const body = await readBody(httpReq);
            updatedUser = JSON.parse(body);
        } catch (e) {
            httpRes.statusCode = 400;
            httpRes.end("Failed to read request body.");
            return;
        }

        const validationError = this._validateScimUser(updatedUser);
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

            for (const handler of this._subscribers) {
                await handler.userUpdated(
                    {
                        externalId: updatedUser.externalId,
                        email: updatedUser.email,
                        name: updatedUser.name.formatted,
                        active: updatedUser.active,
                    },
                    org.id
                );
            }
        } catch (error) {
            console.error(error);
            httpRes.statusCode = 500;
            httpRes.end("Unexpected Error");
            return;
        }

        // TODO: Return the updated user, including ID

        httpRes.statusCode = 200;
        httpRes.end();
    }

    // TODO: This needs to match on a given id instead of just /Users (/Users/<id>)
    private async _handleScimUsersDelete(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let deletedUser: ScimUser;

        const { secretToken, orgId } = this._getDataFromScimRequest(httpReq);

        if (!secretToken || !orgId) {
            httpRes.statusCode = 400;
            httpRes.end("Empty SCIM Secret Token / Org Id");
            return;
        }

        try {
            const body = await readBody(httpReq);
            deletedUser = JSON.parse(body);
        } catch (e) {
            httpRes.statusCode = 400;
            httpRes.end("Failed to read request body.");
            return;
        }

        const validationError = this._validateScimUser(deletedUser);
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

            for (const handler of this._subscribers) {
                await handler.userDeleted(
                    {
                        externalId: deletedUser.externalId,
                        email: deletedUser.email,
                        name: deletedUser.name.formatted,
                        active: deletedUser.active,
                    },
                    org.id
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

            for (const handler of this._subscribers) {
                await handler.groupCreated(
                    {
                        externalId: newGroup.externalId,
                        name: newGroup.displayName,
                        members: [],
                    },
                    org.id
                );
            }
        } catch (error) {
            console.error(error);
            httpRes.statusCode = 500;
            httpRes.end("Unexpected Error");
            return;
        }

        // TODO: Return the created group, including ID

        httpRes.statusCode = 201;
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
        switch (url.pathname) {
            // TODO: Implement this
            // case "/Groups":
            //     return this.handleScimGroupsPatch(httpReq, httpRes);
            case "/Users":
                return this._handleScimUsersPatch(httpReq, httpRes);
            default:
                httpRes.statusCode = 404;
                httpRes.end();
        }
    }

    private _handleScimDelete(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const url = new URL(`http://localhost${httpReq.url || ""}`);
        switch (url.pathname) {
            // TODO: Implement this
            // case "/Groups":
            //     return this.handleScimGroupsDelete(httpReq, httpRes);
            case "/Users":
                return this._handleScimUsersDelete(httpReq, httpRes);
            default:
                httpRes.statusCode = 404;
                httpRes.end();
        }
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
