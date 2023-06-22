import { PadlocConfig } from "@padloc/core/src/config/padloc";
import { readFileSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";

export function getJSONConfig() {
    const pathArg = process.argv.find((arg) => arg.startsWith("--config="))?.slice(9) || "./plconfig.json";
    const path = pathArg && resolve(process.cwd(), pathArg);

    if (!path) {
        return new PadlocConfig();
    }

    try {
        return JSON.parse(readFileSync(path, "utf-8"));
    } catch (e) {
        throw `Failed to read config file. Error: ${e.toString()}`;
    }
}

export function getConfig() {
    // const jsonConfig = getJSONConfig();

    const envFile = process.argv.find((arg) => arg.startsWith("--env="))?.slice(6);
    const path = envFile && resolve(process.cwd(), envFile);
    const override = process.argv.includes("--env-override");

    dotenv.config({ override, path });

    // console.log(JSON.stringify(new PadlocConfig().getSchema()));

    return new PadlocConfig().fromEnv(process.env as { [v: string]: string }, "PL_");
}
