import { Serializable } from "./encoding";

export class EmailBreachResult extends Serializable {
    description: string | null = null;

    constructor(vals: Partial<EmailBreachResult>) {
        super();
        Object.assign(this, vals);
    }
}
