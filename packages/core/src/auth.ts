import { Serializable, stringToBytes, base64ToBytes, bytesToBase64 } from "./encoding";
import { getProvider, PBKDF2Params } from "./crypto";
import { Storable } from "./storage";
import { AccountID } from "./account";
import { randomNumber } from "./util";

export class Auth extends Serializable implements Storable {
    account: AccountID = "";
    verifier!: Uint8Array;
    keyParams = new PBKDF2Params();

    get id() {
        return this.email;
    }

    constructor(public email: string = "") {
        super();
    }

    toRaw() {
        return {
            ...super.toRaw(),
            verifier: bytesToBase64(this.verifier)
        };
    }

    validate() {
        return (
            typeof this.email === "string" && typeof this.account === "string" && this.verifier instanceof Uint8Array
        );
    }

    fromRaw({ email, account, verifier, keyParams }: any) {
        return super.fromRaw({
            email,
            account,
            verifier: base64ToBytes(verifier),
            keyParams: new PBKDF2Params().fromRaw(keyParams)
        });
    }

    async getAuthKey(password: string) {
        if (!this.keyParams.salt.length) {
            this.keyParams.salt = await getProvider().randomBytes(16);
        }
        return getProvider().deriveKey(stringToBytes(password), this.keyParams);
    }
}

export type EmailVerificationPurpose = "create_account" | "recover_account";

export class EmailVerification extends Serializable implements Storable {
    created = new Date();
    code: string = "";
    token: string = "";
    tries: number = 0;

    get id() {
        return this.email;
    }

    constructor(public email: string, public purpose: EmailVerificationPurpose = "create_account") {
        super();
    }

    async init() {
        const codeLen = 6;
        let code = (await randomNumber(0, Math.pow(10, codeLen) - 1)).toString();
        while (code.length < codeLen) {
            code = "0" + code;
        }
        this.code = code;
        this.token = bytesToBase64(await getProvider().randomBytes(16));
        this.tries = 0;
    }

    validate() {
        return (
            typeof this.email === "string" &&
            typeof this.code === "string" &&
            typeof this.token === "string" &&
            ["create_account", "recover_account"].includes(this.purpose) &&
            typeof this.tries === "number" &&
            this.created instanceof Date
        );
    }

    fromRaw({ email, code, token, created, purpose, tries }: any) {
        return super.fromRaw({
            email,
            code,
            token,
            purpose,
            tries,
            created: new Date(created)
        });
    }
}
