import geolite2 from "geolite2-redist";
import maxmind, { type CityResponse } from "maxmind";

const lookupPromise = getLookup();

export async function getLookup() {
    try {
        await geolite2.downloadDbs();
        return geolite2.open<CityResponse>("GeoLite2-City", (path) => {
            return maxmind.open(path);
        });
    } catch (error) {
        console.log(error);
        return {
            get: () => null,
        };
    }
}

export async function getLocation(ip: string) {
    const lookup = await lookupPromise;
    const city = lookup.get(ip);
    return city;
}
