import { suite, test } from "mocha";
import { assert } from "chai";
import { createHash, generateKeyPairSync, sign } from "crypto";
import { Auth, Authenticator, AuthRequest, AuthType } from "@padloc/core/src/auth";
import { WebAuthnConfig, WebAuthnServer } from "../src/auth/webauthn";

const rpID = "localhost";
const origin = "https://localhost";
const server = new WebAuthnServer(new WebAuthnConfig({ rpID, origin, rpName: "Padloc" }));

suite("WebAuthn", () => {
    test("generates serializable registration options with the existing account ID", async () => {
        const auth = new Auth("test@example.com");
        auth.account = "existing-account";
        const authenticator = new Authenticator({ type: AuthType.WebAuthnPlatform });
        const options = await server.initAuthenticator(authenticator, auth);
        assert.equal(Buffer.from(options.user.id, "base64url").toString(), auth.account);
        assert.equal(options.rp.id, rpID);
        assert.equal(options.authenticatorSelection?.userVerification, "required");
        assert.equal(JSON.parse(JSON.stringify(authenticator.state)).registrationOptions.challenge, options.challenge);
    });

    test("verifies an assertion using a stored credential and persists its counter", async () => {
        const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
        const jwk = publicKey.export({ format: "jwk" });
        // COSE EC2 / ES256 public key, matching the format already stored by Padloc.
        const coseKey = Buffer.concat([
            Buffer.from("a5010203262001215820", "hex"),
            Buffer.from(jwk.x!, "base64url"),
            Buffer.from("225820", "hex"),
            Buffer.from(jwk.y!, "base64url"),
        ]);
        const credentialID = Buffer.from("existing-credential").toString("base64url");
        const authenticator = new Authenticator({
            type: AuthType.WebAuthnPlatform,
            state: {
                registrationInfo: {
                    credentialID,
                    credentialPublicKey: coseKey.toString("base64url"),
                    counter: 1,
                    aaguid: "00000000-0000-0000-0000-000000000000",
                },
            },
        });
        const request = new AuthRequest();
        const options = await server.initAuthRequest(authenticator, request);
        assert.equal(options.rpId, rpID);
        assert.equal(options.allowCredentials?.[0].id, credentialID);
        const clientData = Buffer.from(JSON.stringify({ type: "webauthn.get", challenge: options.challenge, origin }));
        const authenticatorData = Buffer.concat([
            createHash("sha256").update(rpID).digest(),
            Buffer.from([0x05, 0, 0, 0, 2]),
        ]);
        const signature = sign(
            "sha256",
            Buffer.concat([authenticatorData, createHash("sha256").update(clientData).digest()]),
            privateKey
        );
        const response = {
            id: credentialID,
            rawId: credentialID,
            type: "public-key" as const,
            clientExtensionResults: {},
            response: {
                clientDataJSON: clientData.toString("base64url"),
                authenticatorData: authenticatorData.toString("base64url"),
                signature: signature.toString("base64url"),
            },
        };
        const invalidSignature = Buffer.from(signature);
        invalidSignature[invalidSignature.length - 1] ^= 1;
        let rejected = false;
        try {
            await server.verifyAuthRequest(authenticator, request, {
                ...response,
                response: { ...response.response, signature: invalidSignature.toString("base64url") },
            });
        } catch {
            rejected = true;
        }
        assert.isTrue(rejected, "invalid signatures must be rejected");
        assert.equal(authenticator.state.registrationInfo.counter, 1);
        await server.verifyAuthRequest(authenticator, request, response);
        assert.equal(authenticator.state.registrationInfo.counter, 2);
    });

    test("stores a newly registered credential in the existing persistence format", async () => {
        const { publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
        const jwk = publicKey.export({ format: "jwk" });
        const coseKey = Buffer.concat([
            Buffer.from("a5010203262001215820", "hex"),
            Buffer.from(jwk.x!, "base64url"),
            Buffer.from("225820", "hex"),
            Buffer.from(jwk.y!, "base64url"),
        ]);
        const auth = new Auth("test@example.com");
        auth.account = "existing-account";
        const authenticator = new Authenticator({ type: AuthType.WebAuthnPlatform });
        const options = await server.initAuthenticator(authenticator, auth);
        const credentialID = Buffer.from("new-credential");
        const credentialLength = Buffer.alloc(2);
        credentialLength.writeUInt16BE(credentialID.length);
        const authenticatorData = Buffer.concat([
            createHash("sha256").update(rpID).digest(),
            Buffer.from([0x45, 0, 0, 0, 0]),
            Buffer.alloc(16),
            credentialLength,
            credentialID,
            coseKey,
        ]);
        const dataLength = Buffer.alloc(2);
        dataLength.writeUInt16BE(authenticatorData.length);
        // CBOR { fmt: "none", attStmt: {}, authData: <bytes> }.
        const attestationObject = Buffer.concat([
            Buffer.from("a363666d74646e6f6e656761747453746d74a068617574684461746159", "hex"),
            dataLength,
            authenticatorData,
        ]);
        await server.activateAuthenticator(authenticator, {
            id: credentialID.toString("base64url"),
            rawId: credentialID.toString("base64url"),
            type: "public-key",
            clientExtensionResults: {},
            response: {
                clientDataJSON: Buffer.from(
                    JSON.stringify({ type: "webauthn.create", challenge: options.challenge, origin })
                ).toString("base64url"),
                attestationObject: attestationObject.toString("base64url"),
            },
        });
        assert.equal(authenticator.state.registrationInfo.credentialID, credentialID.toString("base64url"));
        assert.equal(authenticator.state.registrationInfo.credentialPublicKey, coseKey.toString("base64url"));
        assert.equal(authenticator.state.registrationInfo.counter, 0);
    });
});
