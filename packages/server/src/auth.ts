import { Storable } from "@padlock/core/src/storage";
import { Session } from "@padlock/core/src/auth";
import { DateString } from "@padlock/core/src/encoding";
import { uuid } from "@padlock/core/src/util";
import { randomBytes } from "crypto";

export class EmailVerification implements Storable {
    kind = "email-verification";
    code: string = "";
    created: DateString = new Date().toISOString();

    get pk() {
        return this.email;
    }

    constructor(public id: string, public email: string) {
        this.code = randomBytes(16).toString("hex");
    }

    async serialize() {
        return {
            email: this.email,
            code: this.code
        };
    }

    async deserialize(raw: any) {
        this.email = raw.email;
        this.code = raw.code;
        return this;
    }
}
