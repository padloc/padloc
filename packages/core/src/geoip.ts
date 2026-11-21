/** Injectable IP geolocation service. A successful lookup must identify a country; city is optional. */
export interface GeoIP {
    readonly attribution?: { text: string; url?: string };
    getLocation(ip: string): Promise<{ country: string; city?: string } | null>;
}
