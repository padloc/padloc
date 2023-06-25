import { Config, ConfigParam } from "../../config";

export class WebAuthnConfig extends Config {
    constructor(init: Partial<WebAuthnConfig> = {}) {
        super();
        Object.assign(this, init);
    }

    @ConfigParam("string", { required: true }, 'The (human readable) "relying party" name')
    rpName: string = "My Padloc Server";

    @ConfigParam("string", { required: true }, "Relying party unique identifier.")
    rpID: string = "padloc.example.com";

    @ConfigParam(
        "string",
        { required: true },
        "The origin where webauthn will be used from. Make sure this is the same origin where the PWA ist hosted."
    )
    origin: string = "https://padloc.example.com";
}
