import { getConfig } from "@padloc/server/src/config";
import { start } from "@padloc/server/src/runtime";
import { EnterpriseConfig } from "./config";
import { EnterpriseExtension } from "./services";

const config = getConfig(new EnterpriseConfig());
void start(config, new EnterpriseExtension(config));
