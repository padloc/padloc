import { Storable } from "./storage";

export type AuditKind = "auth" | "account" | "org" | "vault" | "item";
export type AuditChangeType = "created" | "updated" | "deleted";

export class LogChange extends Storable {
    id: string = "";

    date: Date = new Date();

    get kind(): string {
        return `audit_log_${this.objectKind}`;
    }

    constructor(
        public objectKind: AuditKind,
        public objectId: string,
        public modifierAccountId: string,
        public type: AuditChangeType,
        public metadata?: any
    ) {
        super();
    }
}

export interface Auditor {
    log(kind: AuditKind, id: string, modifierAccountId: string, type: AuditChangeType, metadata?: any): LogChange;
}

export class VoidAuditor implements Auditor {
    log(kind: AuditKind, id: string, modifierAccountId: string, type: AuditChangeType, metadata?: any) {
        return new LogChange(kind, id, modifierAccountId, type, metadata);
    }
}
