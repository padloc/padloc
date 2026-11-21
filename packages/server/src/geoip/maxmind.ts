import { GeoIP } from "@padloc/core/src/geoip";
import { Config, ConfigParam } from "@padloc/core/src/config";
import { resolve } from "path";
import maxmind, { CityResponse, Reader } from "maxmind";

export class MaxMindGeoIPConfig extends Config {
    @ConfigParam()
    dbPath = "./geoip/city.mmdb";
}

/** Read an operator-provided MMDB using compatible country/city fields, without network access. */
export class MaxMindGeoIP implements GeoIP {
    protected _reader?: Reader<CityResponse>;

    constructor(
        readonly config: MaxMindGeoIPConfig,
        readonly attribution?: GeoIP["attribution"],
        protected readonly _open = maxmind.open<CityResponse>
    ) {}

    async start() {
        try {
            this._reader = await this._load();
        } catch (error) {
            console.warn("Unable to load GeoIP database; locations will be unavailable:", error.message);
        }
        return this;
    }

    protected _load(path = this.config.dbPath) {
        return this._open(resolve(path));
    }

    async getLocation(ip: string) {
        const location = this._get(ip);
        const country = location?.country?.names?.["en"]?.trim();
        return country ? { country, city: location?.city?.names?.["en"] } : null;
    }

    private _get(ip: string) {
        if (!maxmind.validate(ip) || ip === "::1" || /^(?:::ffff:)?127\./i.test(ip)) {
            return null;
        }
        try {
            return this._reader?.get(ip) || null;
        } catch (error) {
            console.warn("Unable to read GeoIP record:", error.message);
            this._reader = undefined;
            return null;
        }
    }
}
