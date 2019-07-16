import { assert } from "chai";
import { suite, test } from "mocha";
import { Vault } from "../src/vault";
import { Account } from "../src/account";
import { createVaultItem } from "../src/item";
import { RSAKeyParams } from "../src/crypto";
import { StubCryptoProvider } from "../src/stub-crypto-provider";

const provider = new StubCryptoProvider();

suite("Vault", () => {
    test("save/load", async () => {
        const accessors: { id: string; privateKey: Uint8Array; publicKey: Uint8Array }[] = [];
        for (let i = 0; i < 3; i++) {
            accessors.push(Object.assign({ id: i.toString() }, await provider.generateKey(new RSAKeyParams())));
        }

        let vault = new Vault();

        // set accessors (this will generate the shared key and encrypt it with the respective public keys)
        await vault.updateAccessors(accessors);

        const testItem = await createVaultItem("test");
        vault.items.update(testItem);

        await vault.commit();

        for (const each of accessors) {
            // Make sure no information gets lost during serialization / deserialization
            vault = new Vault().fromRaw(vault.toRaw());

            // Decrypt shared key via private key
            await vault.unlock(each as Account);

            assert.deepEqual([...vault.items][0], testItem);
        }
    });
});
