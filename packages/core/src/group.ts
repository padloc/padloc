import { stringToBytes, bytesToString, bytesToBase64, base64ToBytes, marshal, unmarshal } from "./encoding";
import { RSAPublicKey, RSAPrivateKey, RSAKeyParams, getProvider } from "./crypto";
import { SharedContainer } from "./container";
import { Account } from "./account";
import { VaultID } from "./vault";

export type GroupID = string;

export class Group extends SharedContainer {
    id: GroupID = "";
    name = "";
    publicKey!: RSAPublicKey;
    privateKey!: RSAPrivateKey;
    signedPublicKey?: Uint8Array;
    vaults: {
        id: VaultID;
        readonly: boolean;
    }[] = [];

    toRaw() {
        return {
            ...super.toRaw(["privateKey"]),
            publicKey: bytesToBase64(this.publicKey),
            signedPublicKey: this.signedPublicKey ? bytesToBase64(this.signedPublicKey) : undefined
        };
    }

    validate() {
        return (
            (typeof this.id === "string" &&
                typeof this.name === "string" &&
                this.publicKey instanceof Uint8Array &&
                typeof this.signedPublicKey === "undefined") ||
            (this.signedPublicKey instanceof Uint8Array &&
                this.vaults.every(({ id, readonly }: any) => typeof id === "string" && typeof readonly === "boolean"))
        );
    }

    fromRaw({ id, name, publicKey, signedPublicKey, vaults, ...rest }: any) {
        Object.assign(this, {
            id,
            name,
            publicKey: base64ToBytes(publicKey),
            signedPublicKey: (signedPublicKey && base64ToBytes(signedPublicKey)) || undefined,
            vaults
        });

        return super.fromRaw(rest);
    }

    async generateKeys() {
        const { privateKey, publicKey } = await getProvider().generateKey(new RSAKeyParams());
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        await this.setData(stringToBytes(marshal({ privateKey: bytesToBase64(privateKey) })));
    }

    async access(account: Account | Group) {
        await super.access(account);
        const { privateKey } = unmarshal(bytesToString(await this.getData()));
        this.privateKey = base64ToBytes(privateKey);
    }

    isMember({ id }: { id: string }) {
        return !!this.accessors.find(a => a.id === id);
    }
}
