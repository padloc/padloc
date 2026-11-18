import * as geolite2 from "geolite2-redist";
import maxmind, { CityResponse } from "maxmind";

let lookupPromise: ReturnType<typeof openLookup> | undefined;

export function initGeoIP() {
    return (lookupPromise ??= openLookup());
}

async function openLookup() {
    try {
        await geolite2.downloadDbs();
        return geolite2.open(geolite2.GeoIpDbName.City, (path) => {
            return maxmind.open<CityResponse>(path);
        });
    } catch (error) {
        console.log(error);
        return {
            get: () => null,
        };
    }
}

export async function getLocation(ip: string) {
    if (ip === "::1" || ip.startsWith("127.") || ip.startsWith("::ffff:127.")) {
        return null;
    }
    const lookup = await initGeoIP();
    return lookup.get(ip);
}
