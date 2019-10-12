import { setPlatform } from "@padloc/core/src/platform";
import { WebPlatform } from "./lib/platform";
import "./elements/app";

setPlatform(new WebPlatform());
