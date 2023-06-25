import { Serializable } from "./encoding";

/**
 * Generic type representing the constructor of a class extending [[Config]]
 */
export type ConfigConstructor = new (...args: any[]) => Config;

interface ParamDefinition {
    readonly prop: string;
    readonly type: "string" | "string[]" | "number" | "boolean" | ConfigConstructor;
    readonly secret: boolean;
    readonly required: boolean | { prop: string; value: string | string[] };
    readonly options?: string[];
    readonly default?: any;
    readonly description?: string;
}

export function ConfigParam(
    type: "string" | "string[]" | "number" | "boolean" | ConfigConstructor = "string",
    {
        secret = false,
        options,
        required = false,
        default: def,
    }: {
        secret?: boolean;
        options?: string[];
        required?: boolean | { prop: string; value: string | string[] };
        default?: any;
    } = {},
    description?: string
) {
    return (proto: Config, prop: string) => {
        if (!proto._paramDefinitions) {
            proto._paramDefinitions = [];
        }
        proto._paramDefinitions.push({
            prop,
            type,
            secret,
            options,
            required,
            default: def,
            description,
        });
    };
}

const SECRET_REDACTED_STRING = "[secret redacted]";

export class Config extends Serializable {
    _paramDefinitions?: ParamDefinition[];

    constructor(init?: Pick<Config, "outputSecrets">) {
        super();
        if (init) {
            Object.assign(this, init);
        }
    }

    outputSecrets = false;

    fromEnv(env: { [prop: string]: string }, prefix = "PL_") {
        for (const { prop, type } of this._paramDefinitions || []) {
            // type is another config object
            if (typeof type === "function") {
                const newPrefix = `${prefix}${prop.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase()}_`;
                if (!this[prop] && Object.keys(env).some((key) => key.startsWith(newPrefix))) {
                    this[prop] = new type();
                }
                if (this[prop]) {
                    try {
                        this[prop].fromEnv(env, newPrefix);
                    } catch (e) {
                        console.error(prop, this[prop]);
                        throw e;
                    }
                }
                continue;
            }

            const varName = `${prefix}${prop.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase()}`;

            let str = env[varName];

            if (typeof str === "undefined") {
                continue;
            } else if (type === "number") {
                const num = Number(str);
                if (isNaN(num)) {
                    throw `Invalid value for var ${varName}: ${str} (should be a number)`;
                }
                this[prop] = num;
            } else if (type === "boolean") {
                this[prop] = str.toLocaleLowerCase() === "true";
            } else if (type === "string[]") {
                this[prop] = str.split(",");
            } else {
                this[prop] = str;
            }
        }

        return this;
    }

    toEnv(prefix = "PL_", includeUndefined = false) {
        const vars: { [prop: string]: string } = {};

        for (const { prop, type } of this._paramDefinitions || []) {
            // type is another config object
            if (typeof type === "function") {
                const newPrefix = `${prefix}${prop.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase()}_`;

                if (!this[prop] && !includeUndefined) {
                    continue;
                }

                const subVars =
                    this[prop]?.toEnv(newPrefix, includeUndefined) || new type().toEnv(newPrefix, includeUndefined);
                Object.assign(vars, subVars);
                continue;
            }

            const varName = `${prefix}${prop.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase()}`;

            const val = this[prop];

            if (typeof val === "undefined" && !includeUndefined) {
                continue;
            }

            switch (type) {
                case "string[]":
                    vars[varName] = val?.join(",") || "";
                    break;
                default:
                    vars[varName] = val?.toString() || "";
            }
        }

        return vars;
    }

    toRaw(_version?: string) {
        const raw: any = {};
        for (const { prop, secret } of this._paramDefinitions || []) {
            if (this[prop] instanceof Config) {
                raw[prop] = this[prop].toRaw();
            } else {
                raw[prop] = secret && !this.outputSecrets ? SECRET_REDACTED_STRING : this[prop];
            }
        }
        return raw;
    }

    fromRaw(raw: any) {
        for (const { prop, type } of this._paramDefinitions || []) {
            if (typeof type === "function") {
                this[prop] = typeof raw[prop] === "object" ? new type().fromRaw(raw[prop]) : raw[prop];
            } else {
                this[prop] = raw[prop];
            }
        }
        return this;
    }

    toString() {
        return JSON.stringify(this.toRaw(), null, 4);
    }

    private _schemaFromDefinition(def: ParamDefinition, envVar: string) {
        let schema: any = {};

        switch (def.type) {
            case "string":
                schema = def.options
                    ? { type: "string", enum: def.options, default: def.default }
                    : { type: "string", default: def.default };
                break;
            case "string[]":
                schema = {
                    type: "array",
                    items: def.options ? { type: "string", enum: def.options } : { type: "string" },
                    default: def.default,
                };
                break;
            case "boolean":
                schema = { type: "boolean", default: def.default };
                break;
            case "number":
                schema = { type: "number", default: def.default };
                break;
            default:
                schema = new def.type().getSchema(envVar);
        }

        if (typeof def.type !== "function") {
            schema.envVar = envVar;
        }

        if (def.description) {
            schema.description = def.description;
        }

        if (def.options) {
            schema.description = `${schema.description || ""}\n\nPossible values are:${def.options.map(
                (option) => ` \`${option}\``
            )}`;
        }

        if (def.secret) {
            schema.description =
                `${
                    schema.description || ""
                }\n\n**Note:** This property is a **secret**, which means it will be redacted` +
                " when the config file is sent over the network. If you want to update the value" +
                " simply replace the placeholder string. Otherwise, simply leave it as is.";
        }

        return schema;
    }

    // private _pathToSchema(path: string, value: string | string[], isArray = false) {
    //     const [prop, ...rest] = path.split(".");
    //     const values = Array.isArray(value) ? value : [value];

    //     return rest.length
    //         ? {
    //               type: "object",
    //               properties: {
    //                   [prop]: this._pathToSchema(rest.join("."), value),
    //               },
    //           }
    //         : isArray
    //         ? { contains: { enum: values } }
    //         : { enum: values };
    // }

    getSchema(envPrefix = "PL") {
        const schema: any = {
            type: "object",
            properties: {},
            additionalProperties: false,
            default: this.toRaw(),
        };

        for (const def of this._paramDefinitions || []) {
            schema.properties[def.prop] = this._schemaFromDefinition(
                def,
                `${envPrefix}_${def.prop.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase()}`
            );
            const required = def.required;

            if (!required) {
                // do nothing
            } else if (required === true) {
                if (!schema.required) {
                    schema.required = [];
                }
                schema.required.push(def.prop);
            } else {
                const requiredProp = this._paramDefinitions?.find((p) => p.prop === required.prop);
                if (!requiredProp) {
                    continue;
                }
                if (!schema.allOf) {
                    schema.allOf = [];
                }
                const values = Array.isArray(required.value) ? required.value : [required.value];
                schema.allOf.push({
                    if: {
                        properties: {
                            [requiredProp.prop]:
                                requiredProp.type === "string[]"
                                    ? {
                                          contains: { enum: values },
                                      }
                                    : {
                                          enum: values,
                                      },
                        },
                    },
                    then: {
                        required: [def.prop],
                    },
                });
            }
        }

        return schema;
    }

    replaceSecrets(config: typeof this) {
        for (const def of this._paramDefinitions || []) {
            if (def.secret && this[def.prop] === SECRET_REDACTED_STRING) {
                this[def.prop] = config[def.prop];
            } else if (this[def.prop] instanceof Config && config[def.prop] instanceof Config) {
                this[def.prop].replaceSecrets(config[def.prop]);
            }
        }
    }
}
