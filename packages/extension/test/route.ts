import { strict as assert } from "assert";
import { Router } from "@padloc/app/src/lib/route";
const { JSDOM } = require("jsdom");
describe("extension fragment routing", () => {
    it("preserves the trusted popup pathname through routes and parameters", () => {
        const dom = new JSDOM("", { url: "https://extension.test/popup.html" });
        const previous = {
            window: globalThis.window,
            history: globalThis.history,
            CustomEvent: globalThis.CustomEvent,
        };
        Object.assign(globalThis, {
            window: dom.window,
            history: dom.window.history,
            CustomEvent: dom.window.CustomEvent,
        });
        try {
            const router = new Router("/", true);
            router.go("unlock", { email: "test@example.test" }, true);
            assert.equal(dom.window.location.pathname, "/popup.html");
            assert.equal(router.path, "unlock");
            assert.equal(router.params.email, "test@example.test");
            router.setParams({ search: "a?b&c" });
            assert.equal(router.params.search, "a?b&c");
            router.go("items", { vault: "test" });
            assert.equal(dom.window.location.pathname, "/popup.html");
            const restored = new Router("/", true);
            assert.equal(restored.path, "items");
            assert.equal(restored.params.vault, "test");
        } finally {
            Object.assign(globalThis, previous);
            dom.window.close();
        }
    });
});
