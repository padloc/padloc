import { AuthServer, AuthType } from "@padloc/core/src/auth";
import { DirectoryService } from "@padloc/core/src/directory";
import { ChangeLogger, RequestLogger } from "@padloc/core/src/logging";
import { Provisioner } from "@padloc/core/src/provisioning";
import { Server } from "@padloc/core/src/server";
import { Storage } from "@padloc/core/src/storage";
import { PadlocConfig } from "./config";

export interface ServerServices {
    authServers?: AuthServer[];
    provisioner?: Provisioner;
    directory?: DirectoryService;
    changeLogger?: ChangeLogger;
    requestLogger?: RequestLogger;
    onServerCreated?(server: Server): void | Promise<void>;
}

export interface ExtensionContext {
    dryRun: boolean;
}

export interface ServerExtension {
    initialize(storage: Storage, context: ExtensionContext): Promise<ServerServices>;
}

export function validateCommunityConfig(config: PadlocConfig, env: NodeJS.ProcessEnv = process.env) {
    const enterpriseSetting = Object.keys(env).find(
        (key) =>
            /^(PL_DIRECTORY_|PL_SERVER_SCIM_SERVER_URL$|PL_AUTH_OAUTH_)/.test(key) ||
            (key.startsWith("PL_PROVISIONING_") &&
                key !== "PL_PROVISIONING_BACKEND" &&
                !key.startsWith("PL_PROVISIONING_BASIC_")) ||
            (/^PL_(CHANGE|REQUEST)_LOG_/.test(key) &&
                !(key.endsWith("_ENABLED") && env[key]?.toLowerCase() === "false"))
    );
    if (enterpriseSetting || config.auth.types.includes(AuthType.Oauth) || config.provisioning.backend !== "basic") {
        throw new Error(
            `${
                enterpriseSetting || "The selected authentication/provisioning backend"
            } requires the enterprise server. ` + "Use npm run server:start:enterprise."
        );
    }
}
