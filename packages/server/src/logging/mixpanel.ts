import { LogEvent, Logger, LoggerListOptions } from "@padloc/core/src/logging";
import { Context } from "@padloc/core/src/server";
import { Mixpanel, init } from "mixpanel";
import { MixpanelConfig } from "@padloc/core/src/config/logging/mixpanel";
import { SimpleService } from "@padloc/core/src/service";

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
            Object.assign(flattened, flatten(value, { delimiter, propertyPrefix: propName, exclude }));
        }
    }

    return flattened;
}

export class MixpanelLogger extends SimpleService implements Logger {
    private _mixpanel: Mixpanel;

    constructor(public config: MixpanelConfig, public context?: Context) {
        super();
        this._mixpanel = init(this.config.token);
    }

    withContext(context: Context) {
        return new MixpanelLogger(this.config, context);
    }

    log(type: string, data: any) {
        if (this.config.excludeEvents?.includes(type)) {
            return new LogEvent(type, data, this.context);
        }

        let mixpanelData = data;

        if (this.context) {
            const context = this.context;
            const auth = context.auth;
            const provisioning = context.provisioning?.account;
            mixpanelData = {
                account: auth && {
                    email: auth.email,
                    status: auth.accountStatus,
                    id: auth.accountId,
                },
                provisioning: provisioning && {
                    status: provisioning.status,
                    metaData: provisioning.metaData || undefined,
                },
                device: context.device?.toRaw(),
                sessionId: context.session?.id,
                location: context.location,
                ...data,
            };
        }

        const distinct_id = data.provisioning?.metaData?.mixpanelId;
        if (distinct_id) {
            try {
                this._mixpanel.track(type, {
                    distinct_id,
                    ...flatten(mixpanelData, { exclude: ["kind", "version"] }),
                });
            } catch (e) {}
        }

        return new LogEvent(type, data, this.context);
    }

    list(_opts: LoggerListOptions): Promise<LogEvent[]> {
        throw "Not implemented";
    }
}
