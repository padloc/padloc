import { Config, ConfigParam } from "./config";
import { Provisioner } from "./provisioning";

export class ScimConfig extends Config {
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

export class DefaultScimProvider {
    constructor(public readonly config: ScimConfig, public readonly provisioner: Provisioner) {}

    async init() {
        throw "Not implemented";
    }

    validateScimUser(newUser: ScimUserRequestData): string | null {
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
}
