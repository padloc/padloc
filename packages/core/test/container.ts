import { assert } from "chai";
import { suite, test } from "mocha";
import { ErrorCode } from "../src/error";
import { stringToBytes, bytesToString } from "../src/encoding";
import { SimpleContainer, PBES2Container, SharedContainer } from "../src/container";
import { getProvider, RSAKeyParams } from "../src/crypto";
import { assertReject } from "./lib/util";

const provider = getProvider();

suite("Container", () => {
    test("SimpleContainer", async () => {
        const key = await provider.randomBytes(32);
        const testData = "I'm a very important, very secret message!";

        let container = new SimpleContainer();

        // set encryption key
        await container.access(key);

        // encrypt data
        await container.setData(stringToBytes(testData));

        // Make sure no information gets lost during serialization / deserialization
        container = new SimpleContainer().fromRaw(container.toRaw());

        // Trying to decrypt with a different key should throw an error
        await container.access(await provider.randomBytes(32));
        await assertReject(async () => container.getData(), ErrorCode.DECRYPTION_FAILED);

        // Using the correct key should allow us to retreive the original message
        await container.access(key);
        const data = bytesToString(await container.getData());
        assert.equal(data, testData);
    });

    test("PBES2Container", async () => {
        const password = "correct battery horse staple";
        const testData = "I'm a very important, very secret message!";

        let container = new PBES2Container();

        // set password
        await container.access(password);

        // encrypt data
        await container.setData(stringToBytes(testData));

        // Make sure no information gets lost during serialization / deserialization
        container = new PBES2Container().fromRaw(container.toRaw());

        // Trying to decrypt with a different key should throw an error
        await container.access("wrong password");
        await assertReject(async () => container.getData(), ErrorCode.DECRYPTION_FAILED);

        // Using the correct key should allow us to retreive the original message
        await container.access(password);
        const data = bytesToString(await container.getData());
        assert.equal(data, testData);
    });

    test("SharedContainer", async () => {
        const testData = "I'm a very important, very secret message!";

        const accessors: { id: string; privateKey: Uint8Array; publicKey: Uint8Array }[] = [];

        for (let i = 0; i < 3; i++) {
            accessors.push(Object.assign({ id: i.toString() }, await provider.generateKey(new RSAKeyParams())));
        }

        let container = new SharedContainer();

        // set accessors (this will generate the shared key and encrypt it with the respective public keys)
        await container.updateAccessors(accessors);

        // encrypt data
        await container.setData(stringToBytes(testData));

        for (const each of accessors) {
            // Make sure no information gets lost during serialization / deserialization
            container = new SharedContainer().fromRaw(container.toRaw());

            // Decrypt shared key via private key
            await container.access(each);

            // Decrypt actual data
            const data = bytesToString(await container.getData());
            assert.equal(data, testData);
        }

        // Lets remove one accessor
        await container.updateAccessors(accessors.slice(1));

        // Trying to access with the wrong accessor should throw an error
        await assertReject(async () => container.access(accessors[0]), ErrorCode.MISSING_ACCESS);
    });
});
