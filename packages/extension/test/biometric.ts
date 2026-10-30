import { strict as assert } from "assert";
import { supportsExtensionBiometrics } from "../src/biometric";

describe("extension biometric controls", () => {
    it("enables Chromium controls independently of Firefox metadata", () => {
        assert.ok(supportsExtensionBiometrics("chromium", "", ""));
    });
    it("enables Firefox controls only on 150+ with a stable add-on ID", () => {
        assert.ok(supportsExtensionBiometrics("firefox", "150.0", "test@example.com"));
        assert.ok(supportsExtensionBiometrics("firefox", "159.0", "test@example.com"));
        assert.ok(supportsExtensionBiometrics("firefox", "151.0a1", "test@example.com"));
        assert.equal(supportsExtensionBiometrics("firefox", "149.0", "test@example.com"), false);
        assert.equal(supportsExtensionBiometrics("firefox", "150.0", ""), false);
        assert.equal(supportsExtensionBiometrics("firefox", "unknown", "test@example.com"), false);
    });
    it("does not enable unvalidated browser targets", () => {
        assert.equal(supportsExtensionBiometrics("safari", "150.0", "test@example.com"), false);
        assert.equal(supportsExtensionBiometrics(undefined, "", ""), false);
    });
});
