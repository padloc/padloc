import { Controller } from "@padloc/core/src/server";
import { strict as assert } from "assert";
import { suite, test } from "mocha";
import { resolve } from "path";
import { NewLoginMessage, FailedLoginAttemptMessage } from "@padloc/core/src/messenger";
import { SMTPConfig, SMTPSender } from "../src/email/smtp";
import { GeoIPConfig } from "../src/config";

suite("Configurable GeoIP attribution", () => {
    function render(geoip: GeoIPConfig, failed = false, locationAvailable = true) {
        const config = new SMTPConfig({ templateDir: resolve(__dirname, "../../../assets/email") });
        const sender = new SMTPSender(config);
        const location = (Controller.prototype as any)._buildLocationAndDeviceString(
            geoip.enabled && locationAvailable ? { city: "Berlin", country: "Germany" } : undefined,
            { description: "Sample browser" }
        );
        const attribution =
            geoip.enabled && geoip.attributionText.trim()
                ? { text: geoip.attributionText, url: geoip.attributionUrl }
                : undefined;
        const data = {
            location,
            geoipAttribution: attribution,
        };
        const message = failed ? new FailedLoginAttemptMessage(data) : new NewLoginMessage(data);
        return (sender as any)._getMessageContent(message) as { html: string; text: string };
    }
    for (const failed of [false, true]) {
        test(`renders configured attribution without a footnote marker for ${
            failed ? "failed" : "successful"
        } logins`, () => {
            const config = new GeoIPConfig();
            config.attributionText = 'Example <provider> & "credit"';
            config.attributionUrl = "https://example.com/geoip";
            const { html, text } = render(config, failed);
            assert.match(html, /href="https:\/\/example.com\/geoip"/);
            assert.match(html, /Example &lt;provider&gt; &amp; "credit"/);
            assert.match(html, /Berlin, Germany\./);
            assert.doesNotMatch(html, /<sup>/);
            assert.match(text, /Berlin, Germany\./);
            assert.doesNotMatch(text, /\*/);
            assert.ok(text.includes(config.attributionText));
            assert.ok(text.includes(config.attributionUrl));
            assert.match(text, /IP-based locations are approximate/);
            assert.doesNotMatch(html + text, /{{\s*geoip/);
        });
    }
    test("omits attribution and footnote markers when unconfigured or disabled", () => {
        const config = new GeoIPConfig();
        for (const disabled of [false, true]) {
            if (disabled) {
                config.enabled = false;
                config.attributionText = "Provider";
                config.attributionUrl = "https://example.com";
            }
            const { html, text } = render(config);
            assert.doesNotMatch(html + text, /<sup>|Provider|{{\s*geoip/);
            assert.doesNotMatch(text, /\*/);
            assert.match(
                text,
                disabled ? /from Sample browser in unknown location\./ : /from Sample browser in Berlin, Germany\./
            );
        }
    });
    test("preserves the device when location is unavailable or empty", () => {
        const config = new GeoIPConfig();
        for (const failed of [false, true]) {
            const { html, text } = render(config, failed, false);
            assert.match(html, /from Sample browser in unknown location\./);
            assert.match(text, /from Sample browser in unknown location\./);
            assert.doesNotMatch(text, /\*/);
        }
        const format = (Controller.prototype as any)._buildLocationAndDeviceString;
        assert.equal(format({}, { description: "Browser" }), "Browser in unknown location");
        assert.equal(format(undefined, undefined), "unknown location");
        assert.equal(format({ city: " ", country: "" }, undefined), "unknown location");
        assert.equal(format({ country: "Germany" }, undefined), "Germany");
    });
    test("renders attribution as plain text when no link is configured", () => {
        const config = new GeoIPConfig();
        config.attributionText = "Provider";
        const { html, text } = render(config);
        assert.match(html, /Provider\. IP-based locations/);
        assert.match(text, /Provider\. IP-based locations/);
        assert.doesNotMatch(html, /<a\b[^>]*>Provider<\/a>/);
        config.attributionText = " ";
        assert.doesNotMatch(render(config).text, /IP-based locations/);
    });
});
