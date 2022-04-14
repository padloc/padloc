import { DefaultScimProvider, ScimConfig, ScimUserRequestData } from "@padloc/core/src/scim";
import { MemberProvisioning, Provisioner } from "@padloc/core/src/provisioning";

import { createServer, IncomingMessage, ServerResponse } from "http";
import { readBody } from "./transport/http";

export class ScimProvider extends DefaultScimProvider {
    constructor(public readonly config: ScimConfig, public readonly provisioner: Provisioner) {
        super(config, provisioner);
    }

    async init() {
        await this._startScimServer();
    }

    private _getDataFromScimRequest(httpReq: IncomingMessage) {
        const url = new URL(`http://localhost${httpReq.url || ""}`);
        const secretToken = url.searchParams.get("token") || "";
        const orgId = url.searchParams.get("org") || "";

        // TODO: find account/org based on token
        if (secretToken === "asdrtyghj") {
            return {
                accountId: "472478c5-17e8-4ed5-8f51-05a9c5deaebb",
                orgId,
            };
        }

        return {
            accountId: null,
            orgId: null,
        };
    }

    private async _handleScimUsersPost(httpReq: IncomingMessage, httpRes: ServerResponse) {
        let newUser: ScimUserRequestData;

        const { accountId, orgId } = this._getDataFromScimRequest(httpReq);

        if (!accountId || !orgId) {
            httpRes.statusCode = 400;
            httpRes.end("Invalid SCIM Secret Token");
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

        const validationError = this.validateScimUser(newUser);
        if (validationError) {
            httpRes.statusCode = 400;
            httpRes.end(validationError);
            return;
        }

        try {
            const provisioning = await this.provisioner.getProvisioning({ email: newUser.email });
            const orgProvisioning = provisioning.orgs.find((org) => org.id === orgId);

            if (!orgProvisioning) {
                throw new Error("Organization not found");
            }

            const newProvisioningMember = new MemberProvisioning();
            newProvisioningMember.email = newUser.email;

            orgProvisioning.members.push(newProvisioningMember);

            // TODO: Save?

            // TODO: create auth provisioning
            // TODO: create invite provisioning

            console.log(JSON.stringify({ accountId, orgId, orgProvisioning }, null, 2));
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
