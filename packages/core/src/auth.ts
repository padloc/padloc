import { Serializable, stringToBytes, base64ToBytes, bytesToBase64 } from "./encoding";
import { PBKDF2Params } from "./crypto";
import { getCryptoProvider as getProvider } from "./platform";
import { DeviceInfo } from "./platform";
import { Storable } from "./storage";
import { AccountID } from "./account";

/**
 * Contains authentication data needed for SRP session negotiation
 */
export class Auth extends Serializable implements Storable {
    /** Id of the [[Account]] the authentication data belongs to */
    account: AccountID = "";

    /** Verifier used for SRP session negotiation */
    verifier?: Uint8Array;

    /**
     * Key derivation params used by the client to compute session key from the
     * users master password
     * */
    keyParams = new PBKDF2Params();

    trustedDevices: DeviceInfo[] = [];

    get id() {
        return this.email;
    }

    constructor(public email: string = "") {
        super();
    }

    toRaw() {
        return {
            ...super.toRaw(),
            verifier: this.verifier ? bytesToBase64(this.verifier) : undefined
        };
    }

    validate() {
        return (
            typeof this.email === "string" &&
            typeof this.account === "string" &&
            (typeof this.verifier === "undefined" || this.verifier instanceof Uint8Array)
        );
    }

    fromRaw({ email, account, verifier, keyParams, trustedDevices }: any) {
        return super.fromRaw({
            email,
            account,
            verifier: (verifier && base64ToBytes(verifier)) || undefined,
            keyParams: new PBKDF2Params().fromRaw(keyParams),
            trustedDevices:
                (trustedDevices && trustedDevices.map((device: any) => new DeviceInfo().fromRaw(device))) || []
        });
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
