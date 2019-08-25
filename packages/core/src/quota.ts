import { Serializable } from "./encoding";

export class AccountQuota extends Serializable {
    items = -1;
    storage = -1;
    orgs = -1;

    constructor(vals?: Partial<AccountQuota>) {
        super();
        if (vals) {
            Object.assign(this, vals);
        }
    }

    validate() {
        return typeof this.items === "number" && typeof this.storage === "number";
    }
}

export class OrgQuota extends Serializable {
    members = -1;
    groups = -1;
    vaults = -1;
    storage = -1;

    constructor(vals?: Partial<OrgQuota>) {
        super();
        if (vals) {
            Object.assign(this, vals);
        }
    }

    validate() {
        return (
            typeof this.members === "number" &&
            typeof this.storage === "number" &&
            typeof this.groups === "number" &&
            typeof this.vaults === "number"
        );
    }
}

// export interface QuotaProvider {
//     getOrgQuota(account: Account, org: Org): Promise<OrgQuota | null>;
//     getAccountQuota(account: Account): Promise<AccountQuota>;
// }
//
// export class BasicQuotaProvider {
//     async getOrgQuota(_account: Account, { type }: Org) {
//         switch (type) {
//             case OrgType.Basic:
//                 return new OrgQuota({
//                     members: 10,
//                     storage: 1e9
//                 });
//
//             case OrgType.Team:
//                 return new OrgQuota({
//                     members: 50,
//                     vaults: 10,
//                     storage: 5e9
//                 });
//
//             case OrgType.Business:
//                 return new OrgQuota({
//                     members: 200,
//                     vaults: 50,
//                     groups: 20,
//                     storage: 10e9
//                 });
//         }
//     }
//
//     async getAccountQuota(_account: Account) {
//         return new AccountQuota({
//             storage: 1e9
//         });
//     }
// }
