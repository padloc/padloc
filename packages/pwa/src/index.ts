import { setPlatform } from "@padloc/core/src/platform";
import { WebPlatform } from "@padloc/app/src/lib/platform";
import "@padloc/app/src/elements/app";

setPlatform(new WebPlatform());
