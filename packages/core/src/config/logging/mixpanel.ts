import { Config, ConfigParam } from "../../config";

export class MixpanelConfig extends Config {
    @ConfigParam()
    token!: string;

    @ConfigParam("string[]")
    excludeEvents?: string[];
}
