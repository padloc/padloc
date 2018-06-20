import { request } from "./ajax";
import { resolveLanguage, loadScript } from "./util";
import { getLocale, getPlatformName } from "./platform";
import { Settings } from "./data";
import { Storage, Storable } from "./storage";
import { unmarshal } from "./encoding";

export interface Message {
    id: string;
    from: Date;
    until: Date;
    link: string;
    text: string;
    platform?: string[];
    subStatus?: string[];
    version?: string;
}

export class Messages implements Storable {
    kind = "messages";
    id = "";
    private readMessages: { [id: string]: boolean };

    constructor(public url: string, public storage: Storage, public settings: Settings) {}

    async serialize() {
        return this.readMessages;
    }

    async deserialize(raw: any) {
        this.readMessages = raw;
        return this;
    }

    private async parseAndFilter(data: string): Promise<Message[]> {
        await this.storage.get(this);
        const now = new Date();
        const aa = unmarshal(data) as Message[];
        const read = this.readMessages;
        const platform = await getPlatformName();
        const semver = await loadScript("vendor/semver.js", "semver");

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
                    until: a.until ? new Date(a.until) : new Date(1e13),
                    platform: a.platform,
                    subStatus: a.subStatus,
                    version: a.version
                };
            })
            .filter((a: Message) => {
                return (
                    !read[a.id] &&
                    a.from <= now &&
                    a.until >= now &&
                    (!a.platform || a.platform.includes(platform)) &&
                    (!a.subStatus || a.subStatus.includes(this.settings.syncSubStatus)) &&
                    (!a.version || semver.satisfies(this.settings.version, a.version))
                );
            });
    }

    async fetch(): Promise<Message[]> {
        const req = await request(
            "GET",
            this.url,
            undefined,
            new Map<string, string>([["Accept", "application/json"]])
        );
        return this.parseAndFilter(req.responseText);
    }

    async markRead(a: Message): Promise<void> {
        this.readMessages[a.id] = true;
        await this.storage.set(this);
    }
}
