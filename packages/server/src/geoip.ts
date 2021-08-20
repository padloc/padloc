import geoip from "geoip-lite";

export function getLocation(ip: string) {
    return geoip.lookup(ip);
}
