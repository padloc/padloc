import { Base64String } from "./encoding";
import { getProvider, PBKDF2Params, defaultPBKDF2Params } from "./crypto";
import { Storable } from "./storage";
import { AccountID } from "./account";

export class Auth implements Storable {
    kind = "auth";
    account: AccountID = "";
    verifier: Base64String = "";
    keyParams: PBKDF2Params = defaultPBKDF2Params();

    constructor(public email: string = "") {}

    get pk() {
        return this.email;
    }

    async serialize() {
        return {
            email: this.email,
            account: this.account,
            verifier: this.verifier,
            keyParams: this.keyParams
        };
    }

    async deserialize(raw: any) {
        this.email = raw.email;
        this.account = raw.account;
        this.verifier = raw.verifier;
        this.keyParams = raw.keyParams;
        return this;
    }

    async getAuthKey(password: string) {
        if (!this.keyParams.salt) {
            this.keyParams.salt = await getProvider().randomBytes(16);
        }
        return getProvider().deriveKey(password, this.keyParams);
    }
}

export class EmailVerification implements Storable {
    kind = "email-verification";
    created = new Date();

    get pk() {
        return this.email;
    }

    constructor(public email: string, public code: string = "", public id: string = "") {}

    async serialize() {
        return {
            id: this.id,
            email: this.email,
            code: this.code,
            created: this.created
        };
    }

    async deserialize(raw: any) {
        this.id = raw.id;
        this.email = raw.email;
        this.code = raw.code;
        this.created = new Date(raw.created);
        return this;
    }
}
