import { setPlatform } from "@padloc/core/src/platform";
import { CordovaPlatform } from "./platform";
import "@padloc/app/src/elements/app";

setPlatform(new CordovaPlatform());
