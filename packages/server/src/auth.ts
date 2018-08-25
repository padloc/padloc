import { Storable } from "@padlock/core/src/storage";
import { Session, Device } from "@padlock/core/src/auth";
import { DateString } from "@padlock/core/src/encoding";
import { uuid } from "@padlock/core/src/util";
import { randomBytes } from "crypto";

export class AuthRequest implements Storable {
    kind = "auth_request";
    session: Session = new Session();
    created: DateString = new Date().toISOString();

    static create(email: string, device?: Device) {
        const req = new AuthRequest(email);
        req.code = randomBytes(3).toString("hex");
        req.session = new Session();
        Object.assign(req.session, {
            id: uuid(),
            created: new Date().toISOString(),
            token: randomBytes(16).toString("hex"),
            active: false,
            email,
            device
        });
        return req;
    }

    constructor(public email = "", public code = "") {}

    get pk() {
        return `${this.session.id}`;
    }

    async serialize() {
        return {
            session: await this.session.serialize(),
            code: this.code,
            created: this.created,
            email: this.email
        };
    }

    async deserialize(raw: any) {
        this.session = await new Session().deserialize(raw.session);
        this.code = raw.code;
        this.created = raw.created;
        this.email = raw.email;
        return this;
    }
}
