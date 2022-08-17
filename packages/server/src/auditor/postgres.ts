import { Auditor, LogChange, AuditKind, AuditChangeType } from "@padloc/core/src/auditor";
import { PostgresStorage } from "../storage/postgres";

export class PostgresAuditor implements Auditor {
    constructor(private _storage: PostgresStorage) {}

    log(kind: AuditKind, id: string, modifierAccountId: string, type: AuditChangeType, oldData: any, newData: any) {
        const auditLog = new LogChange(kind, id, modifierAccountId, type, oldData, newData);
        auditLog.id = `${auditLog.date.toISOString()}_${Math.floor(Math.random() * 1e6)}`;
        (async () => {
            try {
                this._storage.save(auditLog);
            } catch (e) {}
        })();
        return auditLog;
    }
}
