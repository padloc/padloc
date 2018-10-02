import { Group, GroupKind } from "./group";

export class Org extends Group {
    kind = "org" as GroupKind;

    get pk() {
        return this.id;
    }
}
