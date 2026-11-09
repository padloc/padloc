import { strict as assert } from "assert";
import { suite, test, beforeEach, afterEach } from "mocha";
import { CompleteAuthRequestParams } from "@padloc/core/src/api";
import { MemoryAttachmentStorage } from "@padloc/core/src/attachment";
import { AccountStatus, Auth, AuthRequestStatus } from "@padloc/core/src/auth";
import { EmailAuthServer } from "@padloc/core/src/auth/email";
import { ErrorCode } from "@padloc/core/src/error";
import { EmailAuthMessage, StubMessenger } from "@padloc/core/src/messenger";
import { getPlatform, setPlatform } from "@padloc/core/src/platform";
import { Server, ServerConfig } from "@padloc/core/src/server";
import { MemoryStorage } from "@padloc/core/src/storage";
import { getIdFromEmail } from "@padloc/core/src/util";
import { RequestMFACodeParams, RetrieveMFATokenParams } from "@padloc/core/src/v3-compat";
import { NodePlatform } from "../src/platform/node";

suite("Legacy email MFA", () => {
    const previousPlatform = getPlatform();
    const email = "user@example.com";
    let server: Server;
    let storage: MemoryStorage;
    let messenger: StubMessenger;

    beforeEach(async () => {
        setPlatform(new NodePlatform());
        storage = new MemoryStorage();
        messenger = new StubMessenger();
        server = new Server(
            new ServerConfig(),
            storage,
            messenger,
            undefined,
            [new EmailAuthServer(messenger)],
            new MemoryAttachmentStorage()
        );
        const auth = new Auth(email);
        await auth.init();
        auth.accountStatus = AccountStatus.Active;
        await storage.save(auth);
    });

    afterEach(() => setPlatform(previousPlatform));

    const controller = () => server.makeController({ id: "unauthenticated-request" });
    const storedAuth = async () => storage.get(Auth, await getIdFromEmail(email));
    const verify = (code: string, purpose = 1) =>
        controller().retrieveMFAToken(new RetrieveMFATokenParams({ email, code, purpose }));

    async function requestCode(purpose = 1) {
        await controller().requestMFACode(new RequestMFACodeParams({ email, purpose }));
        const message = messenger.messages[0].message as EmailAuthMessage;
        return message.data.code;
    }

    for (const purpose of [0, 1, 2, 3]) {
        test(`counts wrong guesses and blocks even the correct code after three failures (purpose ${purpose})`, async () => {
            const correctCode = await requestCode(purpose);
            const wrongCode = correctCode === "000000" ? "000001" : "000000";
            for (let tries = 1; tries <= 3; tries++) {
                await assert.rejects(verify(wrongCode, purpose), { code: ErrorCode.AUTHENTICATION_FAILED });
                assert.equal((await storedAuth()).authRequests[0].tries, tries);
            }
            await assert.rejects(verify(wrongCode, purpose), { code: ErrorCode.AUTHENTICATION_TRIES_EXCEEDED });
            await assert.rejects(verify(correctCode, purpose), { code: ErrorCode.AUTHENTICATION_TRIES_EXCEEDED });
            assert.equal((await storedAuth()).authRequests[0].status, AuthRequestStatus.Started);
        });
    }

    test("verifies a correct code before the attempt limit", async () => {
        const code = await requestCode();
        const result = await verify(code);
        const request = (await storedAuth()).authRequests[0];
        assert.equal(result.token, request.token);
        assert.equal(result.hasAccount, true);
        assert.equal(request.status, AuthRequestStatus.Verified);
        assert.equal(request.tries, 0);
    });

    test("shares the attempt counter with the modern completion endpoint", async () => {
        const code = await requestCode();
        const wrongCode = code === "000000" ? "000001" : "000000";
        const request = (await storedAuth()).authRequests[0];
        await assert.rejects(verify(wrongCode), { code: ErrorCode.AUTHENTICATION_FAILED });
        for (let i = 0; i < 2; i++) {
            await assert.rejects(
                controller().completeAuthRequest(
                    new CompleteAuthRequestParams({ email, id: request.id, data: { code: wrongCode } })
                ),
                { code: ErrorCode.AUTHENTICATION_FAILED }
            );
        }
        await assert.rejects(verify(code), { code: ErrorCode.AUTHENTICATION_TRIES_EXCEEDED });
    });

    test("uses the newest request after a code is resent", async () => {
        await requestCode();
        const first = (await storedAuth()).authRequests[0];
        for (let i = 0; i < 3; i++) {
            await assert.rejects(verify("not-a-code"));
        }
        const code = await requestCode();
        const result = await verify(code);
        const auth = await storedAuth();
        assert.equal(auth.authRequests[0].id, first.id);
        assert.equal(auth.authRequests[0].tries, 3);
        assert.equal(auth.authRequests[1].status, AuthRequestStatus.Verified);
        assert.equal(result.token, auth.authRequests[1].token);
    });
});
