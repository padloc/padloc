import { strict as assert } from "assert";
import { WebAuthnConfig, WebAuthnServer } from "../src/auth/webauthn";
import { AuthType, Authenticator, AuthRequest, AuthPurpose } from "@padloc/core/src/auth";

// Exercise the real verifier's origin and UV checks before signature decoding.
function assertion(origin: string, uv: boolean) {
    const data = Buffer.alloc(37);
    const crypto = require("crypto");
    crypto.createHash("sha256").update("vault.example.com").digest().copy(data);
    data[32] = uv ? 5 : 1; // UP plus optional UV
    return {
        id: "AQ",
        rawId: "AQ",
        type: "public-key",
        response: {
            clientDataJSON: Buffer.from(
                JSON.stringify({ type: "webauthn.get", challenge: "challenge", origin })
            ).toString("base64url"),
            authenticatorData: data.toString("base64url"),
            signature: "AQ",
        },
        clientExtensionResults: {},
    } as any;
}

describe("extension WebAuthn", () => {
    const origin = "chrome-extension://abcdefghijklmnopabcdefghijklmnop";
    const config = new WebAuthnConfig({
        rpID: "vault.example.com",
        origin: "https://vault.example.com",
        origins: ["https://vault.example.com", origin],
    });
    const server = new WebAuthnServer(config);
    const authenticator = () =>
        new Authenticator({
            type: AuthType.WebAuthnPlatform,
            state: {
                registrationInfo: { credentialID: "AQ", credentialPublicKey: "AQ", counter: 0, aaguid: "" },
            },
        });

    it("parses a shared allowlist for web and extension origins", () => {
        const parsed = new WebAuthnConfig().fromEnv(
            { PL_AUTH_WEBAUTHN_ORIGINS: `https://vault.example.com,${origin}` },
            "PL_AUTH_WEBAUTHN_"
        );
        assert.deepEqual(parsed.allowedOrigins, ["https://vault.example.com", origin]);
    });

    it("preserves the legacy origin as a fallback, with an explicit allowlist taking precedence", () => {
        const parsed = new WebAuthnConfig().fromEnv(
            { PL_AUTH_WEBAUTHN_ORIGIN: "https://legacy.example.com" },
            "PL_AUTH_WEBAUTHN_"
        );
        assert.deepEqual(parsed.allowedOrigins, ["https://legacy.example.com"]);
        parsed.origins = [origin];
        assert.deepEqual(parsed.allowedOrigins, [origin]);
        parsed.origins = [];
        assert.deepEqual(parsed.allowedOrigins, ["https://legacy.example.com"]);
        assert.deepEqual(new WebAuthnConfig().allowedOrigins, []);
    });

    it("does not implicitly trust a legacy origin when origins is configured", async () => {
        const explicit = new WebAuthnServer(
            new WebAuthnConfig({
                rpID: config.rpID,
                origin: "https://legacy.example.com",
                origins: [origin],
            })
        );
        const request = new AuthRequest({ state: { authenticationOptions: { challenge: "challenge" } } });
        await assert.rejects(
            explicit.verifyAuthRequest(authenticator(), request, assertion("https://legacy.example.com", true)),
            /origin/i
        );
    });

    it("sends the configured RP ID and requires platform user verification", async () => {
        const options = await server.initAuthRequest(authenticator(), new AuthRequest());
        assert.equal(options.rpId, config.rpID);
        assert.equal(options.userVerification, "required");
        assert.deepEqual(options.allowCredentials?.[0].transports, ["internal"]);
        assert.deepEqual(options.hints, ["client-device"]);
    });

    it("preserves recorded transports and leaves portable credentials unrestricted when unknown", async () => {
        const auth = authenticator();
        auth.state.registrationInfo.transports = ["hybrid", "internal"];
        const options = await server.initAuthRequest(auth, new AuthRequest());
        assert.deepEqual(options.allowCredentials?.[0].transports, ["hybrid", "internal"]);
        auth.type = AuthType.WebAuthnPortable;
        delete auth.state.registrationInfo.transports;
        const portable = await server.initAuthRequest(auth, new AuthRequest());
        assert.equal(portable.allowCredentials?.[0].transports, undefined);
        assert.equal(portable.hints, undefined);
    });

    it("gives independent local unlock enrollments distinct handles without changing MFA account handles", async () => {
        const account = { account: "one-account", email: "test@example.test" } as any;
        const first = new Authenticator({
            id: "chrome-enrollment",
            type: AuthType.WebAuthnPlatform,
            purposes: [AuthPurpose.AccessKeyStore],
        });
        const second = new Authenticator({
            id: "firefox-enrollment",
            type: AuthType.WebAuthnPlatform,
            purposes: [AuthPurpose.AccessKeyStore],
        });
        const a = await server.initAuthenticator(first, account);
        const b = await server.initAuthenticator(second, account);
        assert.equal(Buffer.from(a.user.id, "base64url").toString(), first.id);
        assert.equal(Buffer.from(b.user.id, "base64url").toString(), second.id);
        assert.notEqual(a.user.id, b.user.id);
        const mfa = await server.initAuthenticator(
            new Authenticator({ id: "mfa", type: AuthType.WebAuthnPlatform }),
            account
        );
        assert.equal(Buffer.from(mfa.user.id, "base64url").toString(), account.account);
    });

    it("rejects unapproved origins and does not update the counter", async () => {
        const auth = authenticator();
        const request = new AuthRequest({ state: { authenticationOptions: { challenge: "challenge" } } });
        await assert.rejects(
            server.verifyAuthRequest(auth, request, assertion("chrome-extension://untrusted", true)),
            /origin/i
        );
        assert.equal(auth.state.registrationInfo.counter, 0);
    });

    for (const allowedOrigin of [origin, config.origin]) {
        it(`requires verification for approved origin ${allowedOrigin}`, async () => {
            const request = new AuthRequest({ state: { authenticationOptions: { challenge: "challenge" } } });
            await assert.rejects(
                server.verifyAuthRequest(authenticator(), request, assertion(allowedOrigin, false)),
                /verification/i
            );
        });
    }
});

// A software authenticator exercises successful enrollment and signed unlock,
// including the same server methods used by the extension (no biometric bypass
// is added to the app).
describe("WebAuthn enrollment and signed authentication", () => {
    for (const origin of [
        "http://localhost:8080",
        "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
        "moz-extension://lkhibglpipabmpokebebeanofnkocccdlaadgbkdjgbhhkjmlebappgbpcaabfkn",
    ]) {
        it(`enrolls and verifies signed authentication from ${origin}`, async () => {
            const crypto = require("crypto");
            const { isoCBOR } = require("@simplewebauthn/server/helpers");
            const cbor = { encode: (value: any) => Buffer.from(isoCBOR.encode(value)) };
            const server = new WebAuthnServer(
                new WebAuthnConfig({
                    rpID: "localhost",
                    rpName: "Test",
                    origin: "http://localhost:8080",
                    // Exercise the legacy fallback through both real verifiers too.
                    origins: origin === "http://localhost:8080" ? [] : ["http://localhost:8080", origin],
                })
            );
            const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
            const jwk = publicKey.export({ format: "jwk" });
            const key = cbor.encode(
                new Map([
                    [1, 2],
                    [3, -7],
                    [-1, 1],
                    [-2, Buffer.from(jwk.x, "base64url")],
                    [-3, Buffer.from(jwk.y, "base64url")],
                ])
            );
            const credentialID = crypto.randomBytes(32);
            const auth = new Authenticator({ type: AuthType.WebAuthnPlatform });
            const options = await server.initAuthenticator(auth, {
                account: "test-account",
                email: "test@example.test",
            } as any);
            const clientData = Buffer.from(
                JSON.stringify({ type: "webauthn.create", challenge: options.challenge, origin })
            );
            const header = Buffer.alloc(55);
            crypto.createHash("sha256").update("localhost").digest().copy(header);
            header[32] = 0x45;
            header.writeUInt16BE(credentialID.length, 53);
            const attestation = cbor.encode(
                new Map([
                    ["fmt", "none"],
                    ["attStmt", new Map()],
                    ["authData", Buffer.concat([header, credentialID, key])],
                ])
            );
            await server.activateAuthenticator(auth, {
                id: credentialID.toString("base64url"),
                rawId: credentialID.toString("base64url"),
                type: "public-key",
                response: {
                    clientDataJSON: clientData.toString("base64url"),
                    attestationObject: attestation.toString("base64url"),
                    ...(origin.startsWith("moz-extension:") ? { transports: ["internal"] } : {}),
                },
                clientExtensionResults: {},
                ...(origin.startsWith("chrome-extension:") ? { transports: ["internal"] } : {}),
            } as any);
            if (origin !== "http://localhost:8080")
                assert.deepEqual(auth.state.registrationInfo.transports, ["internal"]);
            const request = new AuthRequest();
            const assertionOptions = await server.initAuthRequest(auth, request);
            const assertionClientData = Buffer.from(
                JSON.stringify({ type: "webauthn.get", challenge: assertionOptions.challenge, origin })
            );
            const authData = Buffer.alloc(37);
            header.subarray(0, 32).copy(authData);
            authData[32] = 5;
            authData.writeUInt32BE(1, 33);
            const signature = crypto.sign(
                "sha256",
                Buffer.concat([authData, crypto.createHash("sha256").update(assertionClientData).digest()]),
                privateKey
            );
            const assertion = {
                id: credentialID.toString("base64url"),
                rawId: credentialID.toString("base64url"),
                type: "public-key",
                response: {
                    clientDataJSON: assertionClientData.toString("base64url"),
                    authenticatorData: authData.toString("base64url"),
                    signature: signature.toString("base64url"),
                },
                clientExtensionResults: {},
            } as any;
            await server.verifyAuthRequest(auth, request, assertion);
            assert.equal(auth.state.registrationInfo.counter, 1);
            await assert.rejects(server.verifyAuthRequest(auth, request, assertion), /counter/i);
            // Change signed data without updating its signature. A failed response
            // must never advance the stored replay counter.
            authData.writeUInt32BE(2, 33);
            assertion.response.authenticatorData = authData.toString("base64url");
            await assert.rejects(server.verifyAuthRequest(auth, request, assertion));
            assert.equal(auth.state.registrationInfo.counter, 1);
        });
    }
});
