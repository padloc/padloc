import { expect, test } from "@playwright/test";
import { e2eEnv } from "./helpers/env";

test.describe("Server", () => {
    const serverUrl = e2eEnv.serverUrl;

    test("responds correctly to valid and invalid requests", async ({ request }) => {
        expect((await request.get(`${serverUrl}/`, { failOnStatusCode: false })).status()).toBe(405);
        expect((await request.put(`${serverUrl}/`, { failOnStatusCode: false })).status()).toBe(405);
        expect((await request.fetch(`${serverUrl}/`, { method: "OPTIONS" })).ok()).toBeTruthy();

        expect((await request.post(`${serverUrl}/`, { failOnStatusCode: false })).status()).toBe(400);

        const invalid = await request.post(`${serverUrl}/`, {
            headers: { "Content-Type": "application/json" },
            data: { email: "user@example.com" },
        });
        expect(invalid.status()).toBe(200);
        const invalidBody = await invalid.json();
        expect(invalidBody.kind).toBe("response");
        expect(invalidBody.error?.code).toBe("invalid_request");
        expect(invalidBody.result).toBeNull();

        const unauth = await request.post(`${serverUrl}/`, {
            headers: { "Content-Type": "application/json" },
            data: {
                method: "getAuthInfo",
                params: [],
                device: {},
                auth: {},
                kind: "request",
                version: "4.0.0",
            },
        });
        expect(unauth.status()).toBe(200);
        const unauthBody = await unauth.json();
        expect(unauthBody.kind).toBe("response");
        expect(unauthBody.error?.code).toBe("invalid_session");
        expect(unauthBody.result).toBeNull();
    });
});
