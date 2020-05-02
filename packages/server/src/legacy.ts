import { request } from "http";
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
        return new Promise<PBES2Container | null>((resolve, reject) => {
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
                    let data = "";
                    res.setEncoding("utf8");
                    res.on("data", chunk => (data += chunk));
                    res.on("end", () => resolve((data && parseLegacyContainer(JSON.parse(data))) || null));
                }
            );

            req.on("error", reject);

            req.end();
        });
    }

    async deleteAccount(email: string) {
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
                () => resolve()
            );

            req.on("error", reject);

            req.end();
        });
    }
}
