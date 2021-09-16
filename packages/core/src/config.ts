import { Serializable, AsSerializable } from "./encoding";

/**
 * Generic type representing the constructor of a class extending [[Config]]
 */
export type ConfigConstructor = new (...args: any[]) => Config;

interface ParamDefinition {
    prop: string;
    type: "string" | "string[]" | "number" | "boolean" | ConfigConstructor;
}

export function ConfigParam(type: "string" | "string[]" | "number" | "boolean" | ConfigConstructor = "string") {
    return (proto: Config, prop: string) => {
        if (typeof type === "function") {
            AsSerializable(type)(proto, prop);
        }
        if (!proto._paramDefinitions) {
            proto._paramDefinitions = [];
        }
        proto._paramDefinitions.push({
            prop,
            type,
        });
    };
}

export class Config extends Serializable {
    _paramDefinitions!: ParamDefinition[];

    fromEnv(env: { [prop: string]: string }, prefix = "PL_") {
        for (const { prop, type } of this._paramDefinitions || []) {
            // type is another config object
            if (typeof type === "function") {
                const newPrefix = `${prefix}${prop.toUpperCase()}_`;
                if (!this[prop] && Object.keys(env).some((key) => key.startsWith(newPrefix))) {
                    this[prop] = new type();
                }
                if (this[prop]) {
                    this[prop].fromEnv(env, newPrefix);
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
}
