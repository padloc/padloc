import { Session, SessionID } from "./session";
import { Account, AccountID } from "./account";
import { Auth, EmailVerificationPurpose } from "./auth";
import { Vault, VaultID } from "./vault";
// import { Invite } from "./invite";
import { Serializable, bytesToBase64, base64ToBytes } from "./encoding";
// import { Attachment } from "./attachment";

export class CreateAccountParams extends Serializable {
    account!: Account;
    auth!: Auth;
    verify!: string;
    invite?: {
        id: string;
        vault: string;
    };

    constructor(props?: Partial<CreateAccountParams>) {
        super();
        props && Object.assign(this, props);
    }

    validate() {
        return (
            typeof this.verify === "string" &&
            (typeof this.invite === "undefined" ||
                (typeof this.invite === "object" &&
                    typeof this.invite.id === "string" &&
                    typeof this.invite.vault === "string"))
        );
    }

    fromRaw({ account, auth, verify, invite }: any) {
        return super.fromRaw({
            verify,
            invite,
            account: new Account().fromRaw(account),
            auth: new Auth().fromRaw(auth)
        });
    }
}

export class RecoverAccountParams extends Serializable {
    account!: Account;
    auth!: Auth;
    verify!: string;

    constructor(props?: Partial<RecoverAccountParams>) {
        super();
        props && Object.assign(this, props);
    }

    validate() {
        return typeof this.verify === "string";
    }

    fromRaw({ account, auth, verify }: any) {
        return super.fromRaw({ verify, account: new Account().fromRaw(account), auth: new Auth().fromRaw(auth) });
    }
}

export class RequestEmailVerificationParams extends Serializable {
    email = "";
    purpose: EmailVerificationPurpose = "create_account";

    constructor(props?: Partial<RequestEmailVerificationParams>) {
        super();
        props && Object.assign(this, props);
    }

    validate() {
        return typeof this.email === "string" && ["create_account", "recover_account"].includes(this.purpose);
    }

    fromRaw({ email, purpose }: any) {
        return super.fromRaw({ email, purpose });
    }
}

export class CompleteEmailVerificationParams extends Serializable {
    email: string = "";
    code: string = "";

    constructor(props?: Partial<CompleteEmailVerificationParams>) {
        super();
        props && Object.assign(this, props);
    }

    validate() {
        return typeof this.email === "string" || typeof this.code === "string";
    }

    fromRaw({ email, code }: any) {
        return super.fromRaw({ email, code });
    }
}

export class InitAuthParams extends Serializable {
    email = "";

    constructor(props?: Partial<InitAuthParams>) {
        super();
        props && Object.assign(this, props);
    }

    validate() {
        return typeof this.email === "string";
    }

    fromRaw({ email }: any) {
        return super.fromRaw({ email });
    }
}

export class InitAuthResponse extends Serializable {
    auth!: Auth;
    B!: Uint8Array;

    constructor(props?: Partial<InitAuthResponse>) {
        super();
        props && Object.assign(this, props);
    }

    fromRaw({ auth, B }: any) {
        return super.fromRaw({
            auth: new Auth().fromRaw(auth),
            B: base64ToBytes(B)
        });
    }

    toRaw() {
        return {
            ...super.toRaw(),
            B: bytesToBase64(this.B)
        };
    }
}

export class CreateSessionParams extends Serializable {
    account!: AccountID;
    M!: Uint8Array;
    A!: Uint8Array;

    constructor(props?: Partial<CreateSessionParams>) {
        super();
        props && Object.assign(this, props);
    }

    validate() {
        return typeof this.account === "string";
    }

    toRaw() {
        return {
            account: this.account,
            M: bytesToBase64(this.M),
            A: bytesToBase64(this.A)
        };
    }

    fromRaw({ account, M, A }: any) {
        return super.fromRaw({ account, M: base64ToBytes(M), A: base64ToBytes(A) });
    }
}

export interface API {
    requestEmailVerification(params: RequestEmailVerificationParams): Promise<void>;
    completeEmailVerification(params: CompleteEmailVerificationParams): Promise<string>;

    initAuth(params: InitAuthParams): Promise<InitAuthResponse>;
    updateAuth(params: Auth): Promise<void>;

    createSession(params: CreateSessionParams): Promise<Session>;
    revokeSession(id: SessionID): Promise<void>;

    createAccount(params: CreateAccountParams): Promise<Account>;
    getAccount(): Promise<Account>;
    updateAccount(account: Account): Promise<Account>;
    recoverAccount(params: RecoverAccountParams): Promise<Account>;

    createVault(vault: Vault): Promise<Vault>;
    getVault(id: VaultID): Promise<Vault>;
    updateVault(vault: Vault): Promise<Vault>;
    deleteVault(id: VaultID): Promise<void>;

    // getInvite(params: { vault: string; id: string }): Promise<Invite>;
    // acceptInvite(invite: Invite): Promise<void>;
    //
    // createAttachment(attachment: Attachment): Promise<Attachment>;
    // getAttachment(attachment: Attachment): Promise<Attachment>;
    // deleteAttachment(attachment: Attachment): Promise<void>;
}
//
// type SerializableClass = new (...args: any[]) => Serializable;
//
// class RPCMethod {
//     constructor(public methodName: string, public argTypes: Array<SerializableClass | string>) {}
//
//     call(api: API, rawArgs: any[], returnArg: Serializable) {
//         if (rawArgs.length !== this.argTypes.length) {
//             throw new Err(ErrorCode.BAD_REQUEST);
//         }
//
//         const args = [];
//
//         for (const [i, arg] of rawArgs.entries()) {
//             const argType = this.argTypes[i];
//             if (typeof argType === "string") {
//                 if (typeof arg !== argType) {
//                     throw new Err(ErrorCode.BAD_REQUEST);
//                 }
//                 args.push(arg);
//             } else {
//                 args.push(new argType().fromRaw(arg));
//             }
//         }
//
//         return api[this.methodName](args).toRaw();
//     }
// }
