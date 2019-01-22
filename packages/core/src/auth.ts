import { Base64String } from "./encoding";
import { getProvider, PBKDF2Params, defaultPBKDF2Params } from "./crypto";
import { Storable } from "./storage";
import { AccountID } from "./account";
import { randomNumber } from "./util";

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

export type EmailVerificationPurpose = "create_account" | "recover_account";

export class EmailVerification implements Storable {
    kind = "email-verification";
    created = new Date();
    code: string = "";
    token: string = "";
    tries: number = 0;

    get pk() {
        return this.email;
    }

    constructor(public email: string, public purpose: EmailVerificationPurpose = "create_account") {}

    async init() {
        const codeLen = 6;
        let code = (await randomNumber(0, Math.pow(10, codeLen) - 1)).toString();
        while (code.length < codeLen) {
            code = "0" + code;
        }
        this.code = code;
        this.token = await getProvider().randomBytes(16);
        this.tries = 0;
    }

    async serialize() {
        return {
            email: this.email,
            code: this.code,
            token: this.token,
            created: this.created,
            purpose: this.purpose,
            tries: this.tries
        };
    }

    async deserialize(raw: any) {
        this.email = raw.email;
        this.code = raw.code;
        this.token = raw.token;
        this.created = new Date(raw.created);
        this.purpose = raw.purpose;
        this.tries = raw.tries;
        return this;
    }
}
