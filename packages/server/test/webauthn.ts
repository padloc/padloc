import { strict as assert } from "assert";
import { WebAuthnConfig, WebAuthnServer } from "../src/auth/webauthn";
import { AuthType, Authenticator, AuthRequest } from "@padloc/core/src/auth";

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
        extensionOrigins: [origin],
    });
    const server = new WebAuthnServer(config);
    const authenticator = () =>
        new Authenticator({
            type: AuthType.WebAuthnPlatform,
            state: {
                registrationInfo: { credentialID: "AQ", credentialPublicKey: "AQ", counter: 0, aaguid: "" },
            },
        });

    it("parses extension origins from environment without replacing the web origin", () => {
        const parsed = new WebAuthnConfig().fromEnv(
            { PL_AUTH_WEBAUTHN_EXTENSION_ORIGINS: origin },
            "PL_AUTH_WEBAUTHN_"
        );
        assert.deepEqual(parsed.extensionOrigins, [origin]);
        assert.equal(config.origin, "https://vault.example.com");
    });

    it("sends the configured RP ID and requires platform user verification", async () => {
        const options = await server.initAuthRequest(authenticator(), new AuthRequest());
        assert.equal(options.rpId, config.rpID);
        assert.equal(options.userVerification, "required");
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
                    extensionOrigins: [origin],
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
                },
                clientExtensionResults: {},
            } as any);
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
