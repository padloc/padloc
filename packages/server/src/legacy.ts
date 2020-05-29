import * as http from "http";
import * as https from "https";
import { LegacyServer } from "@padloc/core/src/server";
import { PBES2Container } from "@padloc/core/src/container";
import { parseLegacyContainer } from "@padloc/core/src/legacy";

export interface NodeLegacyServerConfig {
    url: string;
    key: string;
}

export class NodeLegacyServer implements LegacyServer {
    constructor(public config: NodeLegacyServerConfig) {}

    async getStore(email: string) {
        return new Promise<PBES2Container | null>((resolve, _reject) => {
            const request = this.config.url.startsWith("https") ? https.request : http.request;
            const req = request(
                `${this.config.url}/store/`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `SkeletonKey ${email}:${this.config.key}`,
                        Accept: "application/vnd.padlock;version=1"
                    }
                },
                res => {
                    if (res.statusCode !== 200) {
                        resolve(null);
                        return;
                    }

                    let data = "";

                    res.setEncoding("utf8");
                    res.on("data", chunk => (data += chunk));
                    res.on("end", () => {
                        if (!data) {
                            return null;
                        }

                        try {
                            resolve((data && parseLegacyContainer(JSON.parse(data))) || null);
                        } catch (e) {
                            resolve(null);
                        }
                    });
                }
            );

            req.on("error", () => resolve(null));

            req.end();
        });
    }

    async deleteAccount(email: string) {
        const request = this.config.url.startsWith("https") ? https.request : http.request;
        return new Promise<void>((resolve, reject) => {
            const req = request(
                `${this.config.url}/deleteaccount/`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `SkeletonKey ${email}:${this.config.key}`,
                        Accept: "application/vnd.padlock;version=1"
                    }
                },
                res => {
                    if (res.statusCode !== 200) {
                        reject("Received status code " + res.statusCode);
                        return;
                    }
                    resolve();
                }
            );

            req.on("error", reject);

            req.end();
        });
    }
}
