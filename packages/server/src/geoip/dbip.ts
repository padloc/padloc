import { GeoIP } from "@padloc/core/src/geoip";
import { Config, ConfigParam } from "@padloc/core/src/config";
import maxmind, { CityResponse } from "maxmind";
import { MaxMindGeoIP } from "./maxmind";
import { createWriteStream } from "fs";
import { mkdir, rename, rm } from "fs/promises";
import { dirname, resolve } from "path";
import { randomUUID } from "crypto";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import { createGunzip } from "zlib";

export class DbIpGeoIPConfig extends Config {
    @ConfigParam()
    dbPath = "./geoip/city.mmdb";

    @ConfigParam("boolean")
    autoUpdate = true;
}

/** DB-IP City Lite reader with optional background monthly database updates. */
export class DbIpGeoIP extends MaxMindGeoIP {
    private _timer?: ReturnType<typeof setInterval>;
    private _update?: Promise<void>;
    private _controller?: AbortController;
    private _closed = false;

    constructor(
        readonly config: DbIpGeoIPConfig,
        attribution?: GeoIP["attribution"],
        private readonly _fetch = fetch,
        open = maxmind.open<CityResponse>
    ) {
        super(config, attribution, open);
    }

    protected async _load(path = this.config.dbPath) {
        const reader = await super._load(path);
        if (reader.metadata.databaseType.toLowerCase() !== "dbip-city-lite" || reader.metadata.ipVersion !== 6) {
            throw new Error("Expected DB-IP City Lite with IPv4 and IPv6 support");
        }
        return reader;
    }

    async start() {
        await super.start();
        if (this.config.autoUpdate && !this._timer && !this._closed) {
            void this.refresh();
            this._timer = setInterval(() => void this.refresh(), 24 * 60 * 60 * 1000);
            this._timer.unref();
        }
        return this;
    }

    refresh(now = new Date()): Promise<void> {
        if (!this.config.autoUpdate || this._closed) return Promise.resolve();
        if (this._update) return this._update;
        this._controller = new AbortController();
        this._update = this._download(now)
            .then(() => {})
            .catch((error: Error) => {
                if (!this._closed)
                    console.warn("Unable to update DB-IP City Lite; keeping the previous database:", error.message);
            })
            .finally(() => {
                this._update = undefined;
                this._controller = undefined;
            });
        return this._update!;
    }

    private async _download(now: Date) {
        const edition = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
        const path = resolve(this.config.dbPath);
        try {
            const existing = await this._load(path);
            if (edition(new Date(existing.metadata.buildEpoch)) === edition(now)) return;
        } catch {
            // Missing or invalid files are replaced only after validating the download.
        }
        const temporary = `${path}.${randomUUID()}.tmp`;
        const controller = this._controller!;
        const timeout = setTimeout(() => controller.abort(), 120000);
        try {
            const response = await this._fetch(
                `https://download.db-ip.com/free/dbip-city-lite-${edition(now)}.mmdb.gz`,
                {
                    signal: controller.signal,
                }
            );
            if (!response.ok || !response.body) {
                await response.body?.cancel();
                throw new Error(`DB-IP download returned HTTP ${response.status}`);
            }
            await mkdir(dirname(path), { recursive: true });
            let bytes = 0;
            await pipeline(
                Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
                createGunzip(),
                new Transform({
                    transform(chunk: Buffer, _encoding, callback) {
                        bytes += chunk.length;
                        callback(
                            bytes > 512 * 1024 * 1024 ? new Error("DB-IP database exceeds size limit") : null,
                            chunk
                        );
                    },
                }),
                createWriteStream(temporary, { flags: "wx", mode: 0o644 }),
                { signal: controller.signal }
            );
            const reader = await this._load(temporary);
            if (edition(new Date(reader.metadata.buildEpoch)) !== edition(now)) {
                throw new Error("DB-IP download does not match the requested monthly edition");
            }
            controller.signal.throwIfAborted();
            await rename(temporary, path);
            if (!this._closed) this._reader = reader;
        } finally {
            clearTimeout(timeout);
            await rm(temporary, { force: true });
        }
    }

    close() {
        this._closed = true;
        clearInterval(this._timer);
        this._controller?.abort();
    }
}
