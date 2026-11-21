import { MaxMindGeoIPConfig } from "../src/geoip/maxmind";
import { strict as assert } from "assert";
import { suite, test } from "mocha";
import { mkdtemp, readFile, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { gzipSync } from "zlib";
import { Reader, CityResponse } from "maxmind";
import { GeoIPConfig } from "../src/config";
import { DbIpGeoIP, DbIpGeoIPConfig } from "../src/geoip/dbip";

suite("DB-IP auto-updating service", () => {
    const current = new Date();
    const month = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, "0")}`;
    const metadata = { databaseType: "DBIP-City-Lite", ipVersion: 6, buildEpoch: month + "-01" };
    const record = { country: { names: { en: "Germany" } }, city: { names: { en: "Berlin" } } };
    const open = async (path: string) =>
        ({ metadata: JSON.parse(await readFile(path, "utf8")), get: () => record } as unknown as Reader<CityResponse>);
    async function fixture(run: (config: DbIpGeoIPConfig) => Promise<void>) {
        const dir = await mkdtemp(join(tmpdir(), "padloc-dbip-service-"));
        const config = new DbIpGeoIPConfig();
        config.dbPath = join(dir, "city.mmdb");
        try {
            await run(config);
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    }
    test("defaults to auto updates and parses backend-specific settings", () => {
        assert.equal(new DbIpGeoIPConfig().autoUpdate, true);
        assert.equal(new DbIpGeoIPConfig().dbPath, new MaxMindGeoIPConfig().dbPath);
        assert.ok(!("PL_AUTO_UPDATE" in new MaxMindGeoIPConfig().toEnv("PL_")));
        const config = new GeoIPConfig().fromEnv(
            { PL_GEOIP_BACKEND: "dbip", PL_GEOIP_DBIP_DB_PATH: "/tmp/dbip.mmdb", PL_GEOIP_DBIP_AUTO_UPDATE: "false" },
            "PL_GEOIP_"
        );
        assert.equal(config.backend, "dbip");
        assert.equal(config.dbip?.dbPath, "/tmp/dbip.mmdb");
        assert.equal(config.dbip?.autoUpdate, false);
    });
    test("disabled auto updates use the supplied database without downloads", () =>
        fixture(async (config) => {
            config.autoUpdate = false;
            await writeFile(config.dbPath, JSON.stringify(metadata));
            const service = await new DbIpGeoIP(
                config,
                undefined,
                async () => assert.fail("Unexpected fetch"),
                open
            ).start();
            try {
                await service.refresh();
                assert.deepEqual(await service.getLocation("8.8.8.8"), { country: "Germany", city: "Berlin" });
            } finally {
                service.close();
            }
        }));
    test("downloads in background, deduplicates concurrent checks, and activates the new reader", () =>
        fixture(async (config) => {
            let resolveDownload!: (response: Response) => void;
            let calls = 0;
            const fetcher: typeof fetch = async () => {
                calls++;
                return new Promise((resolve) => {
                    resolveDownload = resolve;
                });
            };
            const service = await new DbIpGeoIP(config, undefined, fetcher, open).start();
            try {
                assert.equal(await service.getLocation("8.8.8.8"), null);
                const update = service.refresh();
                assert.equal(update, service.refresh());
                // The updater checks disk asynchronously before initiating the fetch.
                while (!resolveDownload) await new Promise((resolve) => setImmediate(resolve));
                resolveDownload(new Response(gzipSync(JSON.stringify(metadata))));
                await update;
                assert.equal(calls, 1);
                assert.deepEqual(await service.getLocation("8.8.8.8"), { country: "Germany", city: "Berlin" });
                await service.refresh();
                assert.equal(calls, 1);
            } finally {
                service.close();
            }
        }));
    test("failed updates preserve the old reader and file and can be retried", () =>
        fixture(async (config) => {
            const original = JSON.stringify({ ...metadata, buildEpoch: "2020-01-01" });
            await writeFile(config.dbPath, original);
            let fail = true;
            const service = await new DbIpGeoIP(
                config,
                undefined,
                async () =>
                    fail ? new Response(null, { status: 503 }) : new Response(gzipSync(JSON.stringify(metadata))),
                open
            ).start();
            try {
                await service.refresh();
                assert.equal(await readFile(config.dbPath, "utf8"), original);
                assert.equal((await service.getLocation("8.8.8.8"))?.country, "Germany");
                fail = false;
                await service.refresh();
                assert.deepEqual(JSON.parse(await readFile(config.dbPath, "utf8")), metadata);
            } finally {
                service.close();
            }
        }));
    test("closing the service aborts a pending update and prevents subsequent checks", () =>
        fixture(async (config) => {
            let started!: () => void;
            const fetching = new Promise<void>((resolve) => {
                started = resolve;
            });
            let calls = 0;
            const fetcher: typeof fetch = async (_url, init) => {
                calls++;
                return new Promise((_resolve, reject) => {
                    const abort = () => reject(new Error("Aborted"));
                    init?.signal?.addEventListener("abort", abort, { once: true });
                    started();
                });
            };
            const service = await new DbIpGeoIP(config, undefined, fetcher, open).start();
            const update = service.refresh();
            await fetching;
            service.close();
            await update;
            await service.refresh();
            assert.equal(calls, 1);
        }));
    for (const failure of ["gzip", "parser", "provider", "edition"]) {
        test(`retains the previous file and reader after ${failure} validation failure`, () =>
            fixture(async (config) => {
                const original = JSON.stringify({ ...metadata, buildEpoch: "2020-01-01" });
                await writeFile(config.dbPath, original);
                const fetcher: typeof fetch = async () => {
                    if (failure === "gzip") return new Response("invalid gzip");
                    if (failure === "parser") return new Response(gzipSync("invalid mmdb"));
                    return new Response(
                        gzipSync(
                            JSON.stringify(
                                failure === "provider"
                                    ? { ...metadata, databaseType: "Other-City" }
                                    : { ...metadata, buildEpoch: "2020-01-01" }
                            )
                        )
                    );
                };
                const service = await new DbIpGeoIP(config, undefined, fetcher, open).start();
                try {
                    await service.refresh();
                    assert.equal(await readFile(config.dbPath, "utf8"), original);
                    assert.equal((await service.getLocation("8.8.8.8"))?.country, "Germany");
                    assert.deepEqual(await (await import("fs/promises")).readdir(join(config.dbPath, "..")), [
                        "city.mmdb",
                    ]);
                } finally {
                    service.close();
                }
            }));
    }
});
