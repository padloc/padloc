import { Config, ConfigParam } from "../../config";

export class WebAuthnConfig extends Config {
    constructor(init: Partial<WebAuthnConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam()
    rpName: string = "";

    @ConfigParam()
    rpID: string = "";

    @ConfigParam()
    origin: string = "";
}
