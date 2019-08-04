import * as platform from "@padloc/core/src/platform";
import { CordovaPlatform } from "./platform";
import "@padloc/app/src/elements/app";

platform.setPlatform(new CordovaPlatform());
