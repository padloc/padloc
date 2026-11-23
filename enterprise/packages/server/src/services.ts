import { AuthType } from "@padloc/core/src/auth";
import { ScimSettings } from "@padloc/core/src/org";
import { bytesToBase64 } from "@padloc/core/src/encoding";
import { getCryptoProvider } from "@padloc/core/src/platform";
import { uuid } from "@padloc/core/src/util";
import { BasicProvisioner } from "@padloc/core/src/provisioning";
import { Storage } from "@padloc/core/src/storage";
import { ExtensionContext, ServerExtension, ServerServices } from "@padloc/server/src/extensions";
import { initDataStorage } from "@padloc/server/src/runtime";
import { EnterpriseConfig } from "./config";
import { OauthServer } from "./auth/oauth";
import { DirectorySync } from "./directory";
import { ScimServer } from "./scim";
import { DirectoryProvisioner } from "./provisioning/directory";
import { OauthProvisioner, OauthProvisionerConfig } from "./provisioning/oauth";
import { ChangeLogger, RequestLogger } from "./logging";
import { ApiProvisioner } from "./provisioning/api";
import { StripeProvisioner } from "./provisioning/stripe";

export class EnterpriseExtension implements ServerExtension {
    constructor(private readonly config: EnterpriseConfig) {}

    async initialize(storage: Storage, { dryRun }: ExtensionContext): Promise<ServerServices> {
        const { config } = this;
        // Validate before starting listeners or creating subscriptions.
        if (config.provisioning.backend === "api" && !config.provisioning.api?.apiKey) {
            throw new Error("API provisioning requires PL_PROVISIONING_API_API_KEY.");
        }
        if (config.provisioning.backend === "stripe" && !config.provisioning.stripe?.secretKey) {
            throw new Error("Stripe provisioning requires PL_PROVISIONING_STRIPE_SECRET_KEY.");
        }
        if (
            (config.auth.types.includes(AuthType.Oauth) || config.provisioning.backend === "oauth") &&
            !config.auth.oauth
        ) {
            throw new Error("OAuth requires PL_AUTH_OAUTH_* configuration.");
        }
        for (const provider of config.directory.providers) {
            if (provider !== "scim") {
                throw new Error(`Unsupported directory provider: ${provider}`);
            }
        }

        const providers = config.directory.providers.map(() => new ScimServer(config.directory.scim, storage));
        const services: ServerServices = {
            authServers: config.auth.types.includes(AuthType.Oauth) ? [new OauthServer(config.auth.oauth!)] : [],
            directory: {
                async update(org) {
                    if (org.directory.syncProvider !== "scim") {
                        return;
                    }
                    if (!providers.length) {
                        throw new Error("No SCIM directory provider is configured.");
                    }
                    if (!org.directory.scim) {
                        org.directory.scim = new ScimSettings();
                        org.directory.scim.secret = await getCryptoProvider().randomBytes(16);
                        org.directory.scim.secretToken = bytesToBase64(org.directory.scim.secret, true);
                        org.directory.scim.url = `${config.server.scimServerUrl}/${org.id}`;
                    }
                },
            },
        };

        let startProvisioner: (() => Promise<void>) | undefined;
        let provisioner: BasicProvisioner;
        switch (config.provisioning.backend) {
            case "basic":
                provisioner = new BasicProvisioner(storage, config.provisioning.basic);
                break;
            case "api": {
                const apiProvisioner = new ApiProvisioner(config.provisioning.api!, storage);
                provisioner = apiProvisioner;
                startProvisioner = () => apiProvisioner.init();
                break;
            }
            case "stripe": {
                const stripeProvisioner = new StripeProvisioner(config.provisioning.stripe!, storage);
                provisioner = stripeProvisioner;
                startProvisioner = () => stripeProvisioner.init();
                break;
            }
            case "directory":
                provisioner = new DirectoryProvisioner(storage, providers, config.provisioning.directory);
                break;
            case "oauth":
                provisioner = new OauthProvisioner(
                    storage,
                    config.provisioning.oauth || new OauthProvisionerConfig(),
                    config.auth.oauth!
                );
                break;
            default:
                throw new Error(`Unsupported provisioning backend: ${config.provisioning.backend}`);
        }
        provisioner.directorySyncEnabled = providers.length > 0;
        services.provisioner = provisioner;

        // Disabling capture must not remove access to previously recorded audit entries.
        services.changeLogger = new ChangeLogger(
            config.changeLog.storage ? await initDataStorage(config.changeLog.storage) : storage,
            config.changeLog
        );
        services.requestLogger = new RequestLogger(
            config.requestLog.storage ? await initDataStorage(config.requestLog.storage) : storage,
            config.requestLog
        );
        // Preserve the existing explicit PL_SERVER_SCIM_SERVER_URL override.
        if (!process.env.PL_SERVER_SCIM_SERVER_URL) {
            config.server.scimServerUrl = config.directory.scim.url;
        }
        const syncId = await uuid();
        services.onServerCreated = async (server) => {
            new DirectorySync(server.makeController({ id: syncId }), providers);
            if (!dryRun) {
                await startProvisioner?.();
                for (const provider of providers) {
                    await provider.init();
                }
            }
        };
        return services;
    }
}
