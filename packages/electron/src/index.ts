import * as platform from "@padloc/core/src/platform";
import { ElectronPlatform } from "./platform";
import "@padloc/app/src/elements/app";

platform.setPlatform(new ElectronPlatform());
