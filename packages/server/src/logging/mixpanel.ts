import { Config, ConfigParam } from "@padloc/core/src/config";
import { LogEvent, Logger } from "@padloc/core/src/logging";
import { Mixpanel, init } from "mixpanel";

export class MixpanelConfig extends Config {
    @ConfigParam()
    token!: string;
}

function flatten(
    obj: any,
    {
        delimiter = ".",
        propertyPrefix,
        exclude = [],
    }: { delimiter?: string; propertyPrefix?: string; exclude?: string[] } = {}
): { [prop: string]: any } {
    const flattened: { [prop: string]: any } = {};

    for (const [prop, value] of Object.entries(obj)) {
        if (exclude.includes(prop)) {
            continue;
        }

        const propName = propertyPrefix ? `${propertyPrefix}${delimiter}${prop}` : prop;

        if (
            ["string", "number", "boolean", "undefined"].includes(typeof value) ||
            value === null ||
            value instanceof Date ||
            Array.isArray(value)
        ) {
            flattened[propName] = value;
        } else {
            Object.assign(flattened, flatten(value, { delimiter, propertyPrefix: propName }));
        }
    }

    return flattened;
}

export class MixpanelLogger implements Logger {
    private _mixpanel: Mixpanel;

    constructor(public config: MixpanelConfig) {
        this._mixpanel = init(this.config.token);
    }

    log(type: string, data: any) {
        const distinct_id = data.provisioning?.metaData?.mixpanelId;
        if (distinct_id) {
            this._mixpanel.track(type, {
                distinct_id,
                ...flatten(data, { exclude: ["kind", "version"] }),
            });
        }
        return new LogEvent(type, data);
    }
}
