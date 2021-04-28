import { Serializable } from "./encoding";

/**
 * Represents the result from HaveIBeenPwned's API for checking
 * how many times a user's password has been detected in a known
 * data breach.
 */
export class PasswordBreachResult extends Serializable {
    // the number of times the password has been detected
    count: number = 0;

    constructor(vals: Partial<PasswordBreachResult>) {
        super();
        Object.assign(this, vals);
    }
}

