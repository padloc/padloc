import { request } from "./ajax";
import { Source } from "./source";
import { resolveLanguage } from "./util";
import { getLocale } from "./platform";

export interface Announcement {
    id: string
    from: Date
    until: Date
    link: string
    text: string
}

export class Announcements {

    constructor(public url: string, public source: Source) {}

    private async fetchRead(): Promise<any> {
        const data = await this.source.get();
        return JSON.parse(data || "{}");
    }

    private async saveRead(read: any): Promise<void> {
        await this.source.set(JSON.stringify(read));
    }

    private async parseAndFilter(data: string): Promise<Announcement[]> {
        const now = new Date();
        const aa = JSON.parse(data);
        const read = await this.fetchRead();

        return aa
            .map((a: any) => {
                let text;
                if (typeof a.text === "string") {
                    text = a.text;
                } else {
                    const lang = resolveLanguage(getLocale(), a.text);
                    text = a.text[lang];
                }

                return {
                    id: a.id,
                    link: a.link,
                    text: text,
                    from: a.from ? new Date(a.from) : new Date(0),
                    until: a.until ? new Date(a.until) : new Date(1e13)
                };
            })
            .filter((a: Announcement) => !read[a.id] && a.from <= now && a.until >= now);
    }

    async fetch(): Promise<Announcement[]> {
        const req = await request("GET", this.url, undefined,
            new Map<string, string>([["Accept", "application/json"]]));
        return this.parseAndFilter(req.responseText);
    }

    async markRead(a: Announcement): Promise<void> {
        const read = await this.fetchRead();
        read[a.id] = true;
        await this.saveRead(read);
    }

}

