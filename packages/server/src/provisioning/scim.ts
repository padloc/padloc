import { MemberProvisioning, BasicProvisioner, ProvisioningStatus } from "@padloc/core/src/provisioning";
import { Storage } from "@padloc/core/src/storage";
import { Config, ConfigParam } from "@padloc/core/src/config";
import { Org } from "@padloc/core/src/org";
import { createServer, IncomingMessage, ServerResponse } from "http";

import { readBody } from "../transport/http";

export class ScimProvisionerConfig extends Config {
    @ConfigParam("number")
    port: number = 5000;
}

export interface ScimUserRequestData {
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

// TODO: Groups

export class ScimProvisioner extends BasicProvisioner {
    constructor(public readonly config: ScimProvisionerConfig, public readonly storage: Storage) {
        super(storage);
    }

    async init() {
        await this._startScimServer();
    }

    private _validateScimUser(newUser: ScimUserRequestData): string | null {
        if (!newUser.externalId) {
            return "User must contain externalId";
        }

        if (!newUser.email) {
            return "User must contain email";
        }

        if (!newUser.name.formatted) {
            return "User must contain name.formatted";
        }

        if (newUser.meta.resourceType !== "User") {
            return 'User meta.resourceType must be "User"';
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
        let newUser: ScimUserRequestData;

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
            const provisioning = await this.getProvisioning({ email: newUser.email });
            const orgProvisioning = provisioning.orgs.find((org) => org.id === orgId);
            const org = await this.storage.get(Org, orgId);

            if (!orgProvisioning || !org) {
                throw new Error("Organization not found");
            }

            // TODO: remove this once the secret is stored in the org
            // if (secretToken !== orgProvisioning.scimSecret) {
            if (secretToken !== "asdrtyghj") {
                throw new Error("Invalid SCIM Secret Token");
            }

            const existingMember = orgProvisioning.members.find((member) => member.email === newUser.email);

            if (existingMember) {
                throw new Error("Member already exists");
            }

            const newProvisioningMember = new MemberProvisioning();
            newProvisioningMember.email = newUser.email;

            provisioning.account.status = newUser.active ? ProvisioningStatus.Active : ProvisioningStatus.Suspended;

            orgProvisioning.members.push(newProvisioningMember);

            // TODO: Save
            // await this.storage.save(orgProvisioning);
            // await this.storage.save(provisioning);

            console.log(JSON.stringify({ orgId, orgProvisioning, provisioning, org }, null, 2));
        } catch (error) {
            console.error(error);
            httpRes.statusCode = 500;
            httpRes.end("Unexpected Error");
            return;
        }

        httpRes.statusCode = 200;
        httpRes.end();
    }

    private _handleScimPost(httpReq: IncomingMessage, httpRes: ServerResponse) {
        const url = new URL(`http://localhost${httpReq.url || ""}`);
        switch (url.pathname) {
            // TODO: Implement this
            // case "/Groups":
            //     return this.handleScimGroupsPost(httpReq, httpRes);
            case "/Users":
                return this._handleScimUsersPost(httpReq, httpRes);
            default:
                httpRes.statusCode = 404;
                httpRes.end();
        }
    }

    private async _handleScimRequest(httpReq: IncomingMessage, httpRes: ServerResponse) {
        switch (httpReq.method) {
            case "POST":
                return this._handleScimPost(httpReq, httpRes);
            // TODO: Implement these
            // case "PATCH":
            //     return this._handleScimPatch(httpReq, httpRes);
            // case "DELETE":
            //     return this._handleScimDelete(httpReq, httpRes);
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
