import geolite2 from "geolite2-redist";
import maxmind, { CityResponse } from "maxmind";

let lookupPromise = getLookup();

export async function getLookup() {
    await geolite2.downloadDbs();
    return geolite2.open<CityResponse>("GeoLite2-City", (path) => {
        return maxmind.open(path);
    });
}

export async function getLocation(ip: string) {
    const lookup = await lookupPromise;
    let city = lookup.get(ip);
    return city;
}
