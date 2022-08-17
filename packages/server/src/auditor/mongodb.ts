import { Auditor, LogChange, AuditKind, AuditChangeType } from "@padloc/core/src/auditor";
import { ObjectId } from "mongodb";
import { MongoDBStorage } from "../storage/mongodb";

export class MongoDBAuditor implements Auditor {
    constructor(private _storage: MongoDBStorage) {}

    log(kind: AuditKind, id: string, modifierAccountId: string, type: AuditChangeType, oldData: any, newData: any) {
        const auditLog = new LogChange(kind, id, modifierAccountId, type, oldData, newData);
        auditLog.id = new ObjectId().toString();
        (async () => {
            try {
                this._storage.save(auditLog, { useObjectId: true, acknowledge: false });
            } catch (e) {}
        })();
        return auditLog;
    }
}
