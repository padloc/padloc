import { Serializable, stringToBytes, AsBytes, AsSerializable, AsDate } from "./encoding";
import { PBKDF2Params } from "./crypto";
import { getCryptoProvider as getProvider } from "./platform";
import { DeviceInfo } from "./platform";
import { Storable } from "./storage";
import { AccountID } from "./account";
import { MFAuthenticator, MFARequest } from "./mfa";
import { KeyStoreEntryInfo } from "./key-store";

export enum AuthStatus {
    VerificationPending = "verification_pending",
    Active = "active",
    Blocked = "blocked",
}

/**
 * Contains authentication data needed for SRP session negotiation
 */
export class Auth extends Serializable implements Storable {
    @AsDate()
    created: Date = new Date();

    /** Id of the [[Account]] the authentication data belongs to */
    account?: AccountID = undefined;

    status: AuthStatus = AuthStatus.VerificationPending;

    /** Verifier used for SRP session negotiation */
    @AsBytes()
    verifier?: Uint8Array;

    /**
     * Key derivation params used by the client to compute session key from the
     * users master password
     * */
    @AsSerializable(PBKDF2Params)
    keyParams = new PBKDF2Params();

    @AsSerializable(DeviceInfo)
    trustedDevices: DeviceInfo[] = [];

    @AsSerializable(MFAuthenticator)
    mfAuthenticators: MFAuthenticator[] = [];

    @AsSerializable(MFARequest)
    mfaRequests: MFARequest[] = [];

    @AsSerializable(KeyStoreEntryInfo)
    keyStoreEntries: KeyStoreEntryInfo[] = [];

    mfaOrder: string[] = [];

    get id() {
        return this.email;
    }

    constructor(public email: string = "") {
        super();
    }

    /**
     * Generate the session key from the users master `password`
     */
    async getAuthKey(password: string) {
        // If no salt is set yet (i.e. during initialization),
        // generate a random value
        if (!this.keyParams.salt.length) {
            this.keyParams.salt = await getProvider().randomBytes(16);
        }
        return getProvider().deriveKey(stringToBytes(password), this.keyParams);
    }
}
