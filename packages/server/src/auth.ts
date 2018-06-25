import { Storable } from "@padlock/core/src/storage";
import { Session } from "@padlock/core/src/auth";
import { DateString } from "@padlock/core/src/encoding";
import { uuid } from "@padlock/core/src/util";
import { randomBytes } from "crypto";

export class AuthRequest implements Storable {
    session: Session;
    code: string;
    created: DateString;
    storageKind = "auth_request";

    static create(email: string) {
        const req = new AuthRequest(email);
        req.created = new Date().toISOString();
        req.code = randomBytes(3).toString("hex");
        req.session = {
            id: uuid(),
            account: email,
            created: new Date().toISOString(),
            token: randomBytes(16).toString("hex")
        };
        return req;
    }

    constructor(public email: string, code?: string) {
        if (code) {
            this.code = code;
        }
    }

    get storageKey() {
        return `${this.email}-${this.code}`;
    }

    async serialize() {
        return {
            session: this.session,
            code: this.code,
            created: this.created,
            email: this.email
        };
    }

    async deserialize(raw: any) {
        this.session = raw.session;
        this.code = raw.code;
        this.created = raw.created;
        this.email = raw.email;
        return this;
    }
}
