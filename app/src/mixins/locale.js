import { localize } from "../core/locale";

export function LocaleMixin(superClass) {
    return class LocaleMixin extends superClass {
        $l() {
            return localize.apply(null, arguments);
        }
    };
}
