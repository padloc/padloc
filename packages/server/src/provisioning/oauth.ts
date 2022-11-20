import {
    AccountProvisioning,
    BasicProvisioner,
    BasicProvisionerConfig,
    Provisioning,
    ProvisioningStatus,
} from "@padloc/core/src/provisioning";
import { getIdFromEmail } from "@padloc/core/src/util";
import { Storage } from "@padloc/core/src/storage";
import { ConfigParam } from "@padloc/core/src/config";
import { request } from "../transport/http";
import { AccountID } from "@padloc/core/src/account";
import { Auth } from "@padloc/core/src/auth";
import { OauthConfig, OauthUserInfo } from "../auth/oauth";

export class OauthProvisionerConfig extends BasicProvisionerConfig {
    @ConfigParam("number")
    resyncAfter: number = 10;
}

export class OauthProvisioner extends BasicProvisioner {
    constructor(
        readonly storage: Storage,
        readonly config: OauthProvisionerConfig,
        public readonly oauthConfig: OauthConfig
    ) {
        super(storage, config);
    }

    async orgDeleted() {
        return Promise.resolve();
    }

    async orgOwnerChanged() {
        return Promise.resolve();
    }

    async getProvisioning(opts: { email: string; accountId?: AccountID }) {
        let provisioning = await super.getProvisioning(opts);

        const auth = await this.storage.get(Auth, await getIdFromEmail(opts.email)).catch(() => null);

        if (auth?.metaData?.oauth) {
            if (!provisioning.account.metaData) {
                provisioning.account.metaData = {};
            }
            provisioning.account.metaData.oauth = auth.metaData.oauth;
            auth.metaData.oauth = undefined;
            await this.storage.save(auth);
        }

        if (
            !provisioning.account.metaData?.oauth?.lastSync ||
            provisioning.account.metaData.oauth.lastSync < Date.now() - this.config.resyncAfter * 1000
        ) {
            await this._sync(provisioning);
        }

        provisioning = await super.getProvisioning(opts);

        provisioning.account.skipTos = true;

        return provisioning;
    }

    async accountDeleted(_params: { email: string; accountId?: string }): Promise<void> {}

    private async _sync({ account }: Provisioning) {
        if (!this.oauthConfig) {
            throw "No oauth configuration found!";
        }

        if (!account.metaData?.oauth?.tokens) {
            account.status = ProvisioningStatus.Unprovisioned;
            account.statusLabel = "Access Denied";
            account.statusMessage =
                "You don't have permission to use this service. Please contact the service administrator.";
            account.actionLabel = undefined;
            account.actionUrl = undefined;
            await this.storage.save(account);
            return;
        }

        const body = new URLSearchParams({
            client_id: this.oauthConfig.clientId,
            client_secret: this.oauthConfig.clientSecret,
            grant_type: "refresh_token",
            refresh_token: account.metaData.oauth.tokens.refresh_token,
        }).toString();

        try {
            const tokenRes = await request(this.oauthConfig.tokenEndpoint, "POST", body, {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
                "Content-Length": body.length.toString(),
            });

            const tokens = JSON.parse(tokenRes);

            const userInfoRaw = await request(this.oauthConfig.userInfoEndpoint, "GET", undefined, {
                Accept: "application/json",
                Authorization: `Bearer ${tokens.access_token}`,
            });

            account.metaData.oauth = {
                tokens,
                userInfo: JSON.parse(userInfoRaw),
                lastSync: Date.now(),
            };

            const userInfo = account.metaData.oauth.userInfo;

            Object.assign(account, this._getAccountProvisioningFromUserInfo(userInfo));

            await this.storage.save(account);
            return;
        } catch (e) {
            console.error(`Failed to fetch oauth info for ${account.email}. Error: `, e);
            account.metaData.oauth = undefined;

            account.status = ProvisioningStatus.Unprovisioned;
            account.statusLabel = "Session Expired";
            account.statusMessage = "Your current session has expired. Please log in again!";
            account.actionLabel = undefined;
            account.actionUrl = undefined;
            await this.storage.save(account);
            return;
        }
    }

    protected _getAccountProvisioningFromUserInfo(userInfo: OauthUserInfo): Partial<AccountProvisioning> {
        return {
            status: ProvisioningStatus.Active,
            statusLabel: "Aktive",
            statusMessage: "",
            actionUrl: undefined,
            actionLabel: undefined,
            name:
                userInfo.name ||
                `${userInfo.given_name || ""}${userInfo.given_name && userInfo.family_name ? " " : ""}${
                    userInfo.family_name || ""
                }`,
        };
    }
}
