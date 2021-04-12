import { Serializable } from "./encoding";

export class PasswordBreachResult extends Serializable {
    count: number = 0;

    constructor(vals: Partial<PasswordBreachResult>) {
        super();
        Object.assign(this, vals);
    }
}

