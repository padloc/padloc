import { GeoIPConfig } from "../src/config";
import { strict as assert } from "assert";
import { suite, test } from "mocha";
import { mkdtemp, readFile, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { Reader, CityResponse } from "maxmind";
import { MaxMindGeoIP, MaxMindGeoIPConfig } from "../src/geoip/maxmind";

suite("Local GeoIP MMDB", () => {
    const location = { country: "Germany", city: "Berlin" };
    const record = { country: { names: { en: "Germany" } }, city: { names: { en: "Berlin" } } };
    const open = async (path: string) => {
        const data = JSON.parse(await readFile(path, "utf8"));
        return { metadata: { databaseType: data.provider }, get: () => record } as unknown as Reader<CityResponse>;
    };
    async function fixture(run: (config: MaxMindGeoIPConfig) => Promise<void>) {
        const dir = await mkdtemp(join(tmpdir(), "padloc-geoip-test-"));
        const config = new MaxMindGeoIPConfig();
        config.dbPath = join(dir, "city.mmdb");
        try {
            await run(config);
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    }

    for (const provider of ["DBIP-City-Lite", "GeoLite2-City", "Custom-City"]) {
        test(`reads compatible data without restricting provider: ${provider}`, () =>
            fixture(async (config) => {
                await writeFile(config.dbPath, JSON.stringify({ provider }));
                const lookup = await new MaxMindGeoIP(config, undefined, open).start();
                assert.deepEqual(await lookup.getLocation("8.8.8.8"), location);
                assert.deepEqual(await lookup.getLocation("2001:4860:4860::8888"), location);
                for (const ip of ["invalid", "127.0.0.1", "::ffff:127.0.0.1", "::1"]) {
                    assert.equal(await lookup.getLocation(ip), null);
                }
            }));
    }
    test("requires a nonempty country but permits country-only results", async () => {
        for (const [record, expected] of [
            [{ city: { names: { en: "Berlin" } } }, null],
            [{}, null],
            [{ country: { names: { en: " " } }, city: { names: { en: "Berlin" } } }, null],
            [{ country: { names: { en: "Germany" } } }, { country: "Germany", city: undefined }],
        ] as const) {
            const lookup = await new MaxMindGeoIP(
                new MaxMindGeoIPConfig(),
                undefined,
                async () => ({ get: () => record } as unknown as Reader<CityResponse>)
            ).start();
            assert.deepEqual(await lookup.getLocation("8.8.8.8"), expected);
        }
    });
    test("missing and invalid files leave locations optional", () =>
        fixture(async (config) => {
            assert.equal(await (await new MaxMindGeoIP(config, undefined, open).start()).getLocation("8.8.8.8"), null);
            await writeFile(config.dbPath, "invalid");
            assert.equal(await (await new MaxMindGeoIP(config, undefined, open).start()).getLocation("8.8.8.8"), null);
        }));
    test("corrupt records do not fail requests", () =>
        fixture(async (config) => {
            const lookup = await new MaxMindGeoIP(
                config,
                undefined,
                async () =>
                    ({
                        get() {
                            throw new Error("Corrupt record");
                        },
                    } as unknown as Reader<CityResponse>)
            ).start();
            assert.equal(await lookup.getLocation("8.8.8.8"), null);
            assert.equal(await lookup.getLocation("8.8.4.4"), null);
        }));
    test("parses generic path and attribution environment variables", () => {
        const config = new GeoIPConfig().fromEnv(
            {
                PL_GEOIP_ENABLED: "false",
                PL_GEOIP_MAXMIND_DB_PATH: "/tmp/custom.mmdb",
                PL_GEOIP_ATTRIBUTION_TEXT: "Provider",
                PL_GEOIP_ATTRIBUTION_URL: "https://example.com",
            },
            "PL_GEOIP_"
        );
        assert.equal(config.enabled, false);
        assert.equal(config.maxmind?.dbPath, "/tmp/custom.mmdb");
        assert.equal(config.backend, "maxmind");
        assert.equal(config.attributionText, "Provider");
        assert.equal(config.attributionUrl, "https://example.com");
    });
});
