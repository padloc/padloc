import { suite, test } from "mocha";
import { assert } from "chai";
import dompurify from "../src/tools/dompurify";

suite("Email HTML sanitization", () => {
    test("preserves formatting while stripping executable markup and URLs", () => {
        const clean = dompurify.sanitize(
            '<strong>Hello</strong><img src="x" onerror="alert(1)"><script>alert(2)</script>' +
                '<a href="javascript:alert(3)">link</a>'
        );
        assert.include(clean, "<strong>Hello</strong>");
        assert.notMatch(clean, /onerror|<script|javascript:/i);
    });
});
