import { localize } from "@padlock/core/lib/locale";

export function LocaleMixin(superClass) {
    return class LocaleMixin extends superClass {
        $l() {
            return localize.apply(null, arguments);
        }
    };
}
