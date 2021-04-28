import { Serializable } from "./encoding";

/**
 * Represents the results of an API call to HIBP checking for the brech results of a user
 */
export class EmailBreachResult extends Serializable {
    // the description of the data breach, if present
    description: string | null = null;

    constructor(vals: Partial<EmailBreachResult>) {
        super();
        Object.assign(this, vals);
    }
}
