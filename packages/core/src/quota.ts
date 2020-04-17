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
}
