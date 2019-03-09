import { assert } from "chai";
import { suite, test } from "mocha";
import { ErrorCode } from "../src/error";
import { Account } from "../src/account";
import { bytesToHex } from "../src/encoding";
import { assertReject } from "../src/spec/spec";

suite("Account", () => {
    test("Initialize Account", async () => {
        const email = "hello@example.com";
        const name = "Sir Kuddlesworth";
        const password = "correct battery horse staple";

        let account = new Account();
        account.email = email;
        account.name = name;

        await account.initialize(password);

        const { publicKey, privateKey } = account;

        assert.instanceOf(publicKey, Uint8Array);
        assert.instanceOf(privateKey, Uint8Array);

        account.lock();
        assert(account.locked);

        account = new Account().fromRaw(account.toRaw());

        // @ts-ignore
        assert.include(account, { email, name });

        await assertReject(assert, () => account.unlock("wrong password"), ErrorCode.DECRYPTION_FAILED);

        await account.unlock(password);

        assert.equal(bytesToHex(publicKey), bytesToHex(account.publicKey));
        assert.equal(bytesToHex(privateKey), bytesToHex(account.privateKey));
    });
});
