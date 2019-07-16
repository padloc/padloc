import { setPlatform } from "@padloc/core/src/platform";
import { WebPlatform } from "./platform";
import "./elements/app";

setPlatform(new WebPlatform());
