import { Account } from "@padloc/core/src/account";
import { BaseClient } from "@padloc/core/lib/client";
import { BillingAPI, BillingInfo, UpdateBillingInfoParams } from "./api";

export class BillingClient extends BaseClient implements BillingAPI {
    async getBillingInfo(_: Account) {
        const res = await this.call("getBillingInfo");
        return new BillingInfo().fromRaw(res.result);
    }

    async updateBillingInfo(_: Account, params: UpdateBillingInfoParams) {
        const res = await this.call("updateBillingInfo", [params.toRaw()]);
        return new BillingInfo().fromRaw(res.result);
    }
}
