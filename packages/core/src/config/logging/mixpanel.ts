import { Config, ConfigParam } from "../../config";

export class MixpanelConfig extends Config {
    @ConfigParam("string", { required: true, default: "" }, "The mixpanel token.")
    token!: string;

    @ConfigParam("string[]", {}, "A list of of events to exclude from tracking.")
    excludeEvents?: string[];
}
