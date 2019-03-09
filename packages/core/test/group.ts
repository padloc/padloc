import { assert } from "chai";
import { suite, test } from "mocha";
import { Group } from "../src/group";
import { Account } from "../src/account";
import { getProvider, RSAKeyParams } from "../src/crypto";
import { bytesToHex } from "../src/encoding";

const provider = getProvider();

suite("Group", () => {
    test("save/unlock", async () => {
        const accessors: { id: string; privateKey: Uint8Array; publicKey: Uint8Array }[] = [];
        for (let i = 0; i < 3; i++) {
            accessors.push(Object.assign({ id: i.toString() }, await provider.generateKey(new RSAKeyParams())));
        }

        let group = new Group();

        // set accessors (this will generate the shared key and encrypt it with the respective public keys)
        await group.updateAccessors(accessors);

        await group.generateKeys();

        assert.instanceOf(group.privateKey, Uint8Array);
        assert.instanceOf(group.publicKey, Uint8Array);

        const { publicKey, privateKey } = group;

        for (const each of accessors) {
            // Make sure no information gets lost during serialization / deserialization
            group = new Group().fromRaw(group.toRaw());

            // Decrypt shared key via private key
            await group.unlock(each as Account);

            assert.equal(bytesToHex(group.publicKey), bytesToHex(publicKey));
            assert.equal(bytesToHex(group.privateKey), bytesToHex(privateKey));
        }
    });
});
