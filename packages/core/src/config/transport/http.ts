import { Config, ConfigParam } from "../../config";

export class HTTPReceiverConfig extends Config {
    @ConfigParam("number", { required: true, default: 3000 }, "The port number the server should listen on.")
    port: number = 3000;

    @ConfigParam("number", { required: true, default: 1e7 }, "The maximum size of the request body in bytes.")
    maxRequestSize: number = 1e9;

    @ConfigParam(
        "string",
        { required: true, default: "*" },
        "The origin to allow requests from. This will be set as the value of the `Access-Control-Allow-Origin` header."
    )
    allowOrigin: string = "*";

    /** Path on the HTTP server for responding with 200, to be used in health checks (e.g. load balancers) */
    @ConfigParam(
        "string",
        { required: true, default: "/healthcheck" },
        "The path to use for the health check endpoint."
    )
    healthCheckPath = "/healthcheck";
}
